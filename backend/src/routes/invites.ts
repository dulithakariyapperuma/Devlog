import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireOrgRole, requireTeamRole } from "../middleware/requireRole";
import { OrgRole, TeamRole } from "@prisma/client";

const router = Router();

// Helper to hash tokens
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const generateInviteSchema = z.object({
  organizationId: z.string().uuid(),
  teamId: z.string().uuid().optional(),
  role: z.string(), // e.g., "ORG_MEMBER" or "TEAM_ADMIN"
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

// ── POST /api/invites/generate ────────────────────────────────────────────────
// Requires ORG_ADMIN or TEAM_ADMIN depending on scope
router.post(
  "/generate",
  authMiddleware,
  async (req: Request, res: Response) => {
    const parse = generateInviteSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten().fieldErrors });
      return;
    }

    const { organizationId, teamId, role, expiresInDays } = parse.data;

    // Check permissions based on scope
    if (teamId) {
      // Trying to invite to a team
      const membership = await prisma.teamMembership.findUnique({
        where: { teamId_userId: { teamId, userId: req.user!.userId } },
      });
      const orgMembership = await prisma.orgMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId: req.user!.userId } },
      });

      const isTeamAdmin = membership && (membership.role === "TEAM_OWNER" || membership.role === "TEAM_ADMIN");
      const isOrgAdmin = orgMembership && (orgMembership.role === "ORG_OWNER" || orgMembership.role === "ORG_ADMIN");
      
      if (!isTeamAdmin && !isOrgAdmin && req.user!.globalRole !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Not authorized to invite to this team" });
        return;
      }
    } else {
      // Trying to invite to the organization
      const orgMembership = await prisma.orgMembership.findUnique({
        where: { organizationId_userId: { organizationId, userId: req.user!.userId } },
      });
      if ((!orgMembership || (orgMembership.role !== "ORG_OWNER" && orgMembership.role !== "ORG_ADMIN")) && req.user!.globalRole !== "SUPER_ADMIN") {
        res.status(403).json({ error: "Not authorized to invite to this organization" });
        return;
      }
    }

    // Generate secure token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const invite = await prisma.invite.create({
      data: {
        tokenHash,
        organizationId,
        teamId,
        role,
        expiresAt,
        createdById: req.user!.userId,
      },
    });

    // Return the raw token ONLY once
    res.status(201).json({
      id: invite.id,
      inviteLink: `/join/invite/${rawToken}`,
      rawToken,
      expiresAt: invite.expiresAt,
    });
  }
);

// ── GET /api/invites/validate/:token ──────────────────────────────────────────
// Public endpoint for checking an invite before accepting
router.get("/validate/:token", async (req: Request, res: Response) => {
  const tokenHash = hashToken(req.params.token);

  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: {
      organization: { select: { name: true, slug: true } },
      team: { select: { name: true, slug: true } },
    },
  });

  if (!invite) {
    res.status(404).json({ error: "Invalid invite token" });
    return;
  }

  if (invite.status !== "active") {
    res.status(400).json({ error: `Invite is ${invite.status}` });
    return;
  }

  if (invite.expiresAt < new Date()) {
    res.status(400).json({ error: "Invite has expired" });
    return;
  }

  res.json({
    id: invite.id,
    organization: invite.organization,
    team: invite.team,
    role: invite.role,
    expiresAt: invite.expiresAt,
  });
});

// ── POST /api/invites/accept/:token ───────────────────────────────────────────
router.post("/accept/:token", authMiddleware, async (req: Request, res: Response) => {
  const tokenHash = hashToken(req.params.token);

  // Transaction ensures we accept the invite and create membership atomically
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invite = await tx.invite.findUnique({
        where: { tokenHash },
      });

      if (!invite || invite.status !== "active" || invite.expiresAt < new Date()) {
        throw new Error("Invalid, expired, or previously accepted invite");
      }

      // Mark invite as accepted (single-use)
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      });

      // Always create OrgMembership first (ensure user is part of the org)
      const orgRole = invite.teamId ? OrgRole.ORG_MEMBER : (invite.role as OrgRole);
      
      await tx.orgMembership.upsert({
        where: { organizationId_userId: { organizationId: invite.organizationId, userId: req.user!.userId } },
        update: {}, // Keep existing role if they are already in the org
        create: {
          organizationId: invite.organizationId,
          userId: req.user!.userId,
          role: orgRole,
        },
      });

      // If it's a team invite, create the TeamMembership
      if (invite.teamId) {
        await tx.teamMembership.upsert({
          where: { teamId_userId: { teamId: invite.teamId, userId: req.user!.userId } },
          update: { role: invite.role as TeamRole }, // Upgrade/change their role
          create: {
            teamId: invite.teamId,
            userId: req.user!.userId,
            role: invite.role as TeamRole,
          },
        });
      }

      return invite;
    });

    res.json({ message: "Invite accepted successfully", organizationId: result.organizationId, teamId: result.teamId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
