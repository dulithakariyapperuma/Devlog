/**
 * src/routes/teams.ts
 * ─────────────────────────────────────────────────────
 * Team management routes.
 *
 * GET    /api/teams                              — list my teams
 * GET    /api/teams/:teamId                      — get team details
 * PATCH  /api/teams/:teamId                      — update team (TEAM_ADMIN+)
 * DELETE /api/teams/:teamId                      — delete team (TEAM_OWNER or SUPER_ADMIN)
 * GET    /api/teams/:teamId/members              — list all team members
 * PATCH  /api/teams/:teamId/members/:userId/role — change a member's role (TEAM_ADMIN+)
 * PATCH  /api/teams/:teamId/members/:userId/status — update online status
 * DELETE /api/teams/:teamId/members/:userId      — remove a member (TEAM_ADMIN+)
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { TeamRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  requireTeamRole,
  requireTeamAdmin,
  requireOrgAdmin,
} from "../middleware/requireRole";

const router = Router();

// All routes require auth
router.use(authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  organizationId: z.string().uuid(),
});

const changeRoleSchema = z.object({
  role: z.enum(["TEAM_MEMBER", "TEAM_ADMIN", "TEAM_OWNER"]),
});

const changeStatusSchema = z.object({
  status: z.enum(["online", "away", "offline"]),
});

// ── POST /api/teams ───────────────────────────────────────────────────────────
router.post("/", requireOrgAdmin, async (req: Request, res: Response) => {
  const parse = createTeamSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, description, organizationId } = parse.data;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");

  const team = await prisma.team.create({
    data: {
      name,
      slug,
      description,
      organizationId,
    },
  });

  // Make the creator a TEAM_ADMIN
  await prisma.teamMembership.create({
    data: {
      userId: req.user!.userId,
      teamId: team.id,
      role: "TEAM_ADMIN",
      status: "online",
    },
  });

  res.status(201).json({
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    organizationId: team.organizationId,
  });
});

// ── GET /api/teams ────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const memberships = await prisma.teamMembership.findMany({
    where: { userId: req.user!.userId },
    include: {
      team: {
        include: {
          _count: { select: { memberships: true, projects: true } },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  res.json(
    memberships.map((m) => ({
      id: m.team.id,
      organizationId: m.team.organizationId,
      name: m.team.name,
      slug: m.team.slug,
      description: m.team.description,
      role: m.role,
      memberCount: m.team._count.memberships,
      projectCount: m.team._count.projects,
      joinedAt: m.joinedAt,
    }))
  );
});

// ── GET /api/teams/:teamId ────────────────────────────────────────────────────
router.get("/:teamId", requireTeamRole(), async (req: Request, res: Response) => {
  const team = await prisma.team.findUnique({
    where: { id: req.params.teamId },
    include: {
      _count: { select: { memberships: true, projects: true } },
    },
  });

  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }

  res.json({
    id: team.id,
    organizationId: team.organizationId,
    name: team.name,
    slug: team.slug,
    description: team.description,
    memberCount: team._count.memberships,
    projectCount: team._count.projects,
    createdAt: team.createdAt,
    yourRole: req.teamRole,
  });
});

// ── PATCH /api/teams/:teamId ──────────────────────────────────────────────────
router.patch("/:teamId", requireTeamAdmin, async (req: Request, res: Response) => {
  const parse = updateTeamSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const team = await prisma.team.update({
    where: { id: req.params.teamId },
    data: parse.data,
  });

  res.json({ id: team.id, name: team.name, description: team.description });
});

// ── DELETE /api/teams/:teamId ─────────────────────────────────────────────────
router.delete(
  "/:teamId",
  requireTeamRole([TeamRole.TEAM_OWNER]),
  async (req: Request, res: Response) => {
    await prisma.team.delete({ where: { id: req.params.teamId } });
    res.json({ message: "Team deleted" });
  }
);

// ── GET /api/teams/:teamId/members ────────────────────────────────────────────
router.get(
  "/:teamId/members",
  requireTeamRole(),
  async (req: Request, res: Response) => {
    const memberships = await prisma.teamMembership.findMany({
      where: { teamId: req.params.teamId },
      include: { user: true },
      orderBy: { joinedAt: "asc" },
    });

    res.json(
      memberships.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
      }))
    );
  }
);

// ── PATCH /api/teams/:teamId/members/:userId/role ─────────────────────────────
router.patch(
  "/:teamId/members/:userId/role",
  requireTeamAdmin,
  async (req: Request, res: Response) => {
    const parse = changeRoleSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten().fieldErrors });
      return;
    }

    const membership = await prisma.teamMembership.update({
      where: {
        teamId_userId: {
          teamId: req.params.teamId,
          userId: req.params.userId,
        },
      },
      data: { role: parse.data.role as TeamRole },
    });

    res.json({ userId: req.params.userId, role: membership.role });
  }
);

// ── PATCH /api/teams/:teamId/members/:userId/status ───────────────────────────
router.patch(
  "/:teamId/members/:userId/status",
  requireTeamRole(),
  async (req: Request, res: Response) => {
    // Users can only change their own status (unless team admin)
    const isSelf = req.params.userId === req.user!.userId;
    const isLeaderOrAbove =
      req.teamRole === TeamRole.TEAM_ADMIN ||
      req.teamRole === TeamRole.TEAM_OWNER ||
      req.user?.globalRole === "SUPER_ADMIN";

    if (!isSelf && !isLeaderOrAbove) {
      res.status(403).json({ error: "You can only change your own status" });
      return;
    }

    const parse = changeStatusSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten().fieldErrors });
      return;
    }

    await prisma.teamMembership.update({
      where: {
        teamId_userId: {
          teamId: req.params.teamId,
          userId: req.params.userId,
        },
      },
      data: { status: parse.data.status },
    });

    res.json({ status: parse.data.status });
  }
);

// ── DELETE /api/teams/:teamId/members/:userId ─────────────────────────────────
router.delete(
  "/:teamId/members/:userId",
  requireTeamAdmin,
  async (req: Request, res: Response) => {
    await prisma.teamMembership.delete({
      where: {
        teamId_userId: {
          teamId: req.params.teamId,
          userId: req.params.userId,
        },
      },
    });
    res.json({ message: "Member removed from team" });
  }
);

export default router;
