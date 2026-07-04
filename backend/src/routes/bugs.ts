/**
 * src/routes/bugs.ts
 * ─────────────────────────────────────────────────────
 * Bug Report CRUD — scoped to team > project.
 *
 * GET    /api/teams/:teamId/projects/:projectId/bugs
 * POST   /api/teams/:teamId/projects/:projectId/bugs
 * GET    /api/teams/:teamId/projects/:projectId/bugs/:bugId
 * PATCH  /api/teams/:teamId/projects/:projectId/bugs/:bugId
 * DELETE /api/teams/:teamId/projects/:projectId/bugs/:bugId
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireTeamRole, requireTeamAdmin } from "../middleware/requireRole";

const router = Router({ mergeParams: true });

router.use(authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const bugSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  stepsToReproduce: z.string().optional(),
  expectedBehavior: z.string().optional(),
  actualBehavior: z.string().optional(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  priority: z.enum(["urgent", "high", "normal", "low"]),
  status: z.enum(["open", "in-review", "resolved", "closed"]).default("open"),
  module: z.string().min(1),
  assigneeId: z.string().uuid().optional(),
  screenshotNote: z.string().optional(),
});

// ── Helper ────────────────────────────────────────────────────────────────────
async function verifyProjectInTeam(projectId: string, teamId: string) {
  return prisma.project.findFirst({ where: { id: projectId, teamId } });
}

// ── GET all bugs ──────────────────────────────────────────────────────────────
router.get("/", requireTeamRole(), async (req: Request, res: Response) => {
  const project = await verifyProjectInTeam(req.params.projectId, req.params.teamId);
  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const bugs = await prisma.bugReport.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(bugs);
});

// ── POST bug ──────────────────────────────────────────────────────────────────
router.post("/", requireTeamRole(), async (req: Request, res: Response) => {
  const parse = bugSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const project = await verifyProjectInTeam(req.params.projectId, req.params.teamId);
  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const bug = await prisma.bugReport.create({
    data: {
      projectId: req.params.projectId,
      reportedById: req.user!.userId,
      title: parse.data.title,
      description: parse.data.description ?? null,
      stepsToReproduce: parse.data.stepsToReproduce ?? null,
      expectedBehavior: parse.data.expectedBehavior ?? null,
      actualBehavior: parse.data.actualBehavior ?? null,
      severity: parse.data.severity,
      priority: parse.data.priority,
      status: parse.data.status,
      module: parse.data.module,
      assigneeId: parse.data.assigneeId ?? null,
      screenshotNote: parse.data.screenshotNote ?? null,
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true } },
    },
  });

  res.status(201).json(bug);
});

// ── GET single bug ────────────────────────────────────────────────────────────
router.get("/:bugId", requireTeamRole(), async (req: Request, res: Response) => {
  const bug = await prisma.bugReport.findFirst({
    where: { id: req.params.bugId, projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true } },
    },
  });

  if (!bug) {
    res.status(404).json({ error: "Bug report not found" });
    return;
  }

  res.json(bug);
});

// ── PATCH bug ─────────────────────────────────────────────────────────────────
router.patch("/:bugId", requireTeamRole(), async (req: Request, res: Response) => {
  const parse = bugSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const bug = await prisma.bugReport.findFirst({
    where: { id: req.params.bugId, projectId: req.params.projectId },
  });

  if (!bug) {
    res.status(404).json({ error: "Bug report not found" });
    return;
  }

  // Only the reporter, assignee, or team leader can update
  const isInvolved =
    bug.reportedById === req.user!.userId ||
    bug.assigneeId === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === "TEAM_ADMIN" ||
    req.teamRole === "TEAM_OWNER" ||
    req.user?.globalRole === "SUPER_ADMIN";

  if (!isInvolved && !isLeaderOrAbove) {
    res.status(403).json({ error: "Not authorized to update this bug report" });
    return;
  }

  const updated = await prisma.bugReport.update({
    where: { id: req.params.bugId },
    data: parse.data,
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      reporter: { select: { id: true, name: true } },
    },
  });

  res.json(updated);
});

// ── DELETE bug ────────────────────────────────────────────────────────────────
router.delete("/:bugId", requireTeamAdmin, async (req: Request, res: Response) => {
  const bug = await prisma.bugReport.findFirst({
    where: { id: req.params.bugId, projectId: req.params.projectId },
  });

  if (!bug) {
    res.status(404).json({ error: "Bug report not found" });
    return;
  }

  const isReporter = bug.reportedById === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === "TEAM_ADMIN" ||
    req.teamRole === "TEAM_OWNER" ||
    req.user?.globalRole === "SUPER_ADMIN";

  if (!isReporter && !isLeaderOrAbove) {
    res.status(403).json({ error: "Only the reporter or team leader can delete bug reports" });
    return;
  }

  await prisma.bugReport.delete({ where: { id: req.params.bugId } });
  res.json({ message: "Bug report deleted" });
});

export default router;
