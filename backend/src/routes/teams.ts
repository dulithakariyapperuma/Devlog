/**
 * src/routes/teams.ts
 * ─────────────────────────────────────────────────────
 * Team management routes.
 *
 * GET    /api/teams                              — list my teams
 * POST   /api/teams                              — create a new team (I become TEAM_LEADER)
 * GET    /api/teams/:teamId                      — get team details
 * PATCH  /api/teams/:teamId                      — update team (TEAM_LEADER+)
 * DELETE /api/teams/:teamId                      — delete team (SUPER_ADMIN only)
 * POST   /api/teams/:teamId/join                 — join a team by slug
 * GET    /api/teams/:teamId/members              — list all team members
 * PATCH  /api/teams/:teamId/members/:userId/role — change a member's role (TEAM_LEADER+)
 * PATCH  /api/teams/:teamId/members/:userId/status — update online status
 * DELETE /api/teams/:teamId/members/:userId      — remove a member (TEAM_LEADER+)
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  requireTeamMembership,
  requireTeamLeader,
  requireSuperAdmin,
} from "../middleware/requireRole";

const router = Router();

// All routes require auth
router.use(authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
});

const joinTeamSchema = z.object({
  slug: z.string().min(1, "Team slug is required"),
});

const changeRoleSchema = z.object({
  role: z.enum(["MEMBER", "TEAM_LEADER"]),
});

const changeStatusSchema = z.object({
  status: z.enum(["online", "away", "offline"]),
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

// ── POST /api/teams ───────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parse = createTeamSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, description } = parse.data;
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now();

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({ data: { name, slug, description } });
    const membership = await tx.teamMembership.create({
      data: { teamId: team.id, userId: req.user!.userId, role: Role.TEAM_LEADER },
    });
    return { team, membership };
  });

  res.status(201).json({
    id: result.team.id,
    name: result.team.name,
    slug: result.team.slug,
    description: result.team.description,
    role: Role.TEAM_LEADER,
  });
});

// ── GET /api/teams/:teamId ────────────────────────────────────────────────────
router.get("/:teamId", requireTeamMembership(), async (req: Request, res: Response) => {
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
router.patch("/:teamId", requireTeamLeader, async (req: Request, res: Response) => {
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
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    await prisma.team.delete({ where: { id: req.params.teamId } });
    res.json({ message: "Team deleted" });
  }
);

// ── POST /api/teams/:teamId/join ──────────────────────────────────────────────
router.post("/:teamId/join", async (req: Request, res: Response) => {
  const parse = joinTeamSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  // Verify the slug matches the team
  const team = await prisma.team.findFirst({
    where: { id: req.params.teamId, slug: parse.data.slug },
  });

  if (!team) {
    res.status(404).json({ error: "Team not found or slug does not match" });
    return;
  }

  // Check if already a member
  const existing = await prisma.teamMembership.findUnique({
    where: { teamId_userId: { teamId: team.id, userId: req.user!.userId } },
  });

  if (existing) {
    res.status(409).json({ error: "You are already a member of this team" });
    return;
  }

  const membership = await prisma.teamMembership.create({
    data: { teamId: team.id, userId: req.user!.userId, role: Role.MEMBER },
  });

  res.status(201).json({
    teamId: team.id,
    teamName: team.name,
    role: membership.role,
  });
});

// ── GET /api/teams/:teamId/members ────────────────────────────────────────────
router.get(
  "/:teamId/members",
  requireTeamMembership(),
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
  requireTeamLeader,
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
      data: { role: parse.data.role as Role },
    });

    res.json({ userId: req.params.userId, role: membership.role });
  }
);

// ── PATCH /api/teams/:teamId/members/:userId/status ───────────────────────────
router.patch(
  "/:teamId/members/:userId/status",
  requireTeamMembership(),
  async (req: Request, res: Response) => {
    // Users can only change their own status (unless team leader)
    const isSelf = req.params.userId === req.user!.userId;
    const isLeaderOrAbove =
      req.teamRole === Role.TEAM_LEADER ||
      req.user?.globalRole === Role.SUPER_ADMIN;

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
  requireTeamLeader,
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
