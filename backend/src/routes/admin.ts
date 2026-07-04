/**
 * src/routes/admin.ts
 * ─────────────────────────────────────────────────────
 * Super Admin dashboard routes.
 * ALL routes here require globalRole = SUPER_ADMIN.
 *
 * GET    /api/admin/stats             — overview stats
 * GET    /api/admin/users             — list all users
 * GET    /api/admin/teams             — list all teams
 * PATCH  /api/admin/users/:userId     — promote/demote user (change globalRole)
 * DELETE /api/admin/users/:userId     — permanently delete a user
 * DELETE /api/admin/teams/:teamId     — permanently delete a team
 * POST   /api/admin/teams             — create a team (with designated leader)
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireSuperAdmin } from "../middleware/requireRole";

const router = Router();

// All admin routes require auth + super admin
router.use(authMiddleware);
router.use(requireSuperAdmin);

// ── Schemas ───────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  globalRole: z.enum(["SUPER_ADMIN", "MEMBER"]).optional(),
  name: z.string().min(2).optional(),
});

const createTeamWithLeaderSchema = z.object({
  teamName: z.string().min(2),
  teamDescription: z.string().optional(),
  // Option A: assign existing user as leader
  leaderId: z.string().uuid().optional(),
  // Option B: create a new user as leader
  leaderEmail: z.string().email().optional(),
  leaderName: z.string().min(2).optional(),
  leaderPassword: z.string().min(6).optional(),
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req: Request, res: Response) => {
  const [userCount, teamCount, projectCount, entryCount, bugCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.team.count(),
      prisma.project.count(),
      prisma.solutionEntry.count(),
      prisma.bugReport.count(),
    ]);

  res.json({ userCount, teamCount, projectCount, entryCount, bugCount });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get("/users", async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = 20;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        memberships: {
          include: { team: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count(),
  ]);

  res.json({
    data: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatar: u.avatar,
      globalRole: u.globalRole,
      createdAt: u.createdAt,
      teams: u.memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        role: m.role,
      })),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// ── GET /api/admin/teams ──────────────────────────────────────────────────────
router.get("/teams", async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = 20;

  const [teams, total] = await Promise.all([
    prisma.team.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: { memberships: true, projects: true },
        },
        memberships: {
          where: { role: Role.TEAM_LEADER },
          include: { user: { select: { id: true, name: true, email: true } } },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.count(),
  ]);

  res.json({
    data: teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      createdAt: t.createdAt,
      memberCount: t._count.memberships,
      projectCount: t._count.projects,
      teamLeader: t.memberships[0]?.user ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
});

// ── PATCH /api/admin/users/:userId ────────────────────────────────────────────
router.patch("/users/:userId", async (req: Request, res: Response) => {
  const parse = updateUserSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  // Prevent self-demotion
  if (req.params.userId === req.user!.userId && parse.data.globalRole !== "SUPER_ADMIN") {
    res.status(400).json({ error: "Cannot demote yourself" });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.userId },
    data: {
      ...(parse.data.name && { name: parse.data.name }),
      ...(parse.data.globalRole !== undefined && {
        globalRole: parse.data.globalRole === "SUPER_ADMIN"
          ? Role.SUPER_ADMIN
          : null,
      }),
    },
  });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
  });
});

// ── DELETE /api/admin/users/:userId ───────────────────────────────────────────
router.delete("/users/:userId", async (req: Request, res: Response) => {
  if (req.params.userId === req.user!.userId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  await prisma.user.delete({ where: { id: req.params.userId } });
  res.json({ message: "User permanently deleted" });
});

// ── DELETE /api/admin/teams/:teamId ───────────────────────────────────────────
router.delete("/teams/:teamId", async (req: Request, res: Response) => {
  await prisma.team.delete({ where: { id: req.params.teamId } });
  res.json({ message: "Team and all its data permanently deleted" });
});

// ── POST /api/admin/teams ─────────────────────────────────────────────────────
/**
 * Admin can create a team and either:
 * A) Assign an existing user as TEAM_LEADER (pass leaderId)
 * B) Create a brand-new user who becomes TEAM_LEADER (pass leaderEmail + leaderName + leaderPassword)
 */
router.post("/teams", async (req: Request, res: Response) => {
  const parse = createTeamWithLeaderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { teamName, teamDescription, leaderId, leaderEmail, leaderName, leaderPassword } = parse.data;

  const slug =
    teamName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" + Date.now();

  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.create({
      data: { name: teamName, slug, description: teamDescription },
    });

    let resolvedLeaderId: string | null = null;

    if (leaderId) {
      // Option A: existing user
      resolvedLeaderId = leaderId;
    } else if (leaderEmail && leaderName && leaderPassword) {
      // Option B: create new user
      const existing = await tx.user.findUnique({ where: { email: leaderEmail } });
      if (existing) throw new Error("Email already registered");

      const avatar = leaderName.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
      const hash = await bcrypt.hash(leaderPassword, 12);

      const newUser = await tx.user.create({
        data: { name: leaderName, email: leaderEmail, passwordHash: hash, avatar },
      });
      resolvedLeaderId = newUser.id;
    }

    if (resolvedLeaderId) {
      await tx.teamMembership.upsert({
        where: { teamId_userId: { teamId: team.id, userId: resolvedLeaderId } },
        create: { teamId: team.id, userId: resolvedLeaderId, role: Role.TEAM_LEADER },
        update: { role: Role.TEAM_LEADER },
      });
    }

    return team;
  });

  res.status(201).json({
    id: result.id,
    name: result.name,
    slug: result.slug,
    description: result.description,
  });
});

export default router;
