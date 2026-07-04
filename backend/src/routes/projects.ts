/**
 * src/routes/projects.ts
 * ─────────────────────────────────────────────────────
 * Project CRUD — all scoped under a team.
 *
 * GET    /api/teams/:teamId/projects                         — list team projects
 * POST   /api/teams/:teamId/projects                         — create project (TEAM_LEADER+)
 * GET    /api/teams/:teamId/projects/:projectId              — get single project with entries
 * PATCH  /api/teams/:teamId/projects/:projectId              — update project (TEAM_LEADER+)
 * DELETE /api/teams/:teamId/projects/:projectId              — delete project (TEAM_LEADER+)
 * POST   /api/teams/:teamId/projects/:projectId/members      — add member to project
 * DELETE /api/teams/:teamId/projects/:projectId/members/:uid — remove member from project
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import {
  requireTeamMembership,
  requireTeamLeader,
} from "../middleware/requireRole";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed"]).default("active"),
  startDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  memberIds: z.array(z.string().uuid()).default([]),
});

const updateProjectSchema = createProjectSchema.partial().omit({ memberIds: true });

const addMemberSchema = z.object({
  userId: z.string().uuid(),
});

// ── GET /api/teams/:teamId/projects ───────────────────────────────────────────
router.get("/", requireTeamMembership(), async (req: Request, res: Response) => {
  const projects = await prisma.project.findMany({
    where: { teamId: req.params.teamId },
    include: {
      members: { include: { user: true } },
      _count: { select: { entries: true, bugs: true, messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      createdAt: p.createdAt,
      memberIds: p.members.map((m) => m.memberId),
      members: p.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
      entryCount: p._count.entries,
      bugCount: p._count.bugs,
      messageCount: p._count.messages,
    }))
  );
});

// ── POST /api/teams/:teamId/projects ──────────────────────────────────────────
router.post("/", requireTeamLeader, async (req: Request, res: Response) => {
  const parse = createProjectSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, description, status, startDate, endDate, memberIds } = parse.data;

  const project = await prisma.$transaction(async (tx) => {
    const p = await tx.project.create({
      data: {
        teamId: req.params.teamId,
        name,
        description,
        status,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    if (memberIds.length > 0) {
      await tx.projectMember.createMany({
        data: memberIds.map((uid) => ({ projectId: p.id, memberId: uid })),
        skipDuplicates: true,
      });
    }

    return tx.project.findUnique({
      where: { id: p.id },
      include: {
        members: { include: { user: true } }
      }
    });
  });

  if (!project) {
    res.status(500).json({ error: "Failed to create project" });
    return;
  }

  res.status(201).json({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    createdAt: project.createdAt,
    memberIds: project.members.map(m => m.memberId)
  });
});

// ── GET /api/teams/:teamId/projects/:projectId ────────────────────────────────
router.get(
  "/:projectId",
  requireTeamMembership(),
  async (req: Request, res: Response) => {
    const project = await prisma.project.findFirst({
      where: { id: req.params.projectId, teamId: req.params.teamId },
      include: {
        members: { include: { user: true } },
        entries: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
        bugs: {
          include: { assignee: true, reporter: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      memberIds: project.members.map((m) => m.memberId),
      members: project.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
      entries: project.entries.map((e) => ({
        id: e.id,
        title: e.title,
        module: e.module,
        status: e.status,
        errorMessage: e.errorMessage,
        explanation: e.explanation,
        codeSnippet: e.codeSnippet,
        createdAt: e.createdAt,
        author: e.author
          ? { id: e.author.id, name: e.author.name, avatar: e.author.avatar }
          : null,
      })),
      bugs: project.bugs.map((b) => ({
        id: b.id,
        title: b.title,
        severity: b.severity,
        priority: b.priority,
        status: b.status,
        module: b.module,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        assignee: b.assignee
          ? { id: b.assignee.id, name: b.assignee.name, avatar: b.assignee.avatar }
          : null,
        reporter: b.reporter
          ? { id: b.reporter.id, name: b.reporter.name }
          : null,
      })),
    });
  }
);

// ── PATCH /api/teams/:teamId/projects/:projectId ──────────────────────────────
router.patch(
  "/:projectId",
  requireTeamLeader,
  async (req: Request, res: Response) => {
    const parse = updateProjectSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten().fieldErrors });
      return;
    }

    const { startDate, endDate, ...rest } = parse.data;

    const project = await prisma.project.updateMany({
      where: { id: req.params.projectId, teamId: req.params.teamId },
      data: {
        ...rest,
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    if (project.count === 0) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    res.json({ message: "Project updated" });
  }
);

// ── DELETE /api/teams/:teamId/projects/:projectId ─────────────────────────────
router.delete(
  "/:projectId",
  requireTeamLeader,
  async (req: Request, res: Response) => {
    await prisma.project.deleteMany({
      where: { id: req.params.projectId, teamId: req.params.teamId },
    });
    res.json({ message: "Project deleted" });
  }
);

// ── POST /api/teams/:teamId/projects/:projectId/members ───────────────────────
router.post(
  "/:projectId/members",
  requireTeamLeader,
  async (req: Request, res: Response) => {
    const parse = addMemberSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: parse.error.flatten().fieldErrors });
      return;
    }

    // Verify the user is actually in the team
    const membership = await prisma.teamMembership.findUnique({
      where: {
        teamId_userId: { teamId: req.params.teamId, userId: parse.data.userId },
      },
    });

    if (!membership) {
      res.status(400).json({ error: "User is not a member of this team" });
      return;
    }

    await prisma.projectMember.upsert({
      where: {
        projectId_memberId: {
          projectId: req.params.projectId,
          memberId: parse.data.userId,
        },
      },
      create: {
        projectId: req.params.projectId,
        memberId: parse.data.userId,
      },
      update: {},
    });

    res.status(201).json({ message: "Member added to project" });
  }
);

// ── DELETE /api/teams/:teamId/projects/:projectId/members/:userId ─────────────
router.delete(
  "/:projectId/members/:userId",
  requireTeamLeader,
  async (req: Request, res: Response) => {
    await prisma.projectMember.deleteMany({
      where: {
        projectId: req.params.projectId,
        memberId: req.params.userId,
      },
    });
    res.json({ message: "Member removed from project" });
  }
);

export default router;
