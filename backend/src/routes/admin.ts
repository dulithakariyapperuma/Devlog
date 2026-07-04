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
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { TeamRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireOrgRole } from "../middleware/requireRole";

const router = Router();

// All admin routes require auth + super admin (passed via middleware requireOrgRole checking for SUPER_ADMIN is tricky here, so let's make a global requireSuperAdmin)
const requireSuperAdmin = (req: Request, res: Response, next: import("express").NextFunction) => {
  if (req.user?.globalRole !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Forbidden. Requires Super Admin" });
    return;
  }
  next();
};

router.use(authMiddleware);
router.use(requireSuperAdmin);

// ── Schemas ───────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  globalRole: z.enum(["SUPER_ADMIN", "MEMBER"]).optional(),
  name: z.string().min(2).optional(),
});

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req: Request, res: Response) => {
  const [userCount, orgCount, teamCount, projectCount, entryCount, bugCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.team.count(),
      prisma.project.count(),
      prisma.solutionEntry.count(),
      prisma.bugReport.count(),
    ]);

  res.json({ userCount, orgCount, teamCount, projectCount, entryCount, bugCount });
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
        orgMemberships: {
          include: { organization: { select: { id: true, name: true } } },
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
      organizations: u.orgMemberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
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
        organization: { select: { name: true } },
        _count: {
          select: { memberships: true, projects: true },
        },
        memberships: {
          where: { role: TeamRole.TEAM_OWNER },
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
      organizationName: t.organization?.name,
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
          ? "SUPER_ADMIN"
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

export default router;
