/**
 * src/routes/entries.ts
 * ─────────────────────────────────────────────────────
 * Solution Entries (DevLog records) — the core feature.
 *
 * GET    /api/teams/:teamId/projects/:projectId/entries           — list
 * POST   /api/teams/:teamId/projects/:projectId/entries           — create
 * PATCH  /api/teams/:teamId/projects/:projectId/entries/:entryId  — update
 * DELETE /api/teams/:teamId/projects/:projectId/entries/:entryId  — delete
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireTeamMembership } from "../middleware/requireRole";

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(requireTeamMembership());

// ── Schemas ───────────────────────────────────────────────────────────────────

const entrySchema = z.object({
  title: z.string().min(1, "Title is required"),
  module: z.string().min(1, "Module is required"),
  status: z.enum(["resolved", "in-progress"]).default("in-progress"),
  errorMessage: z.string().optional(),
  explanation: z.string().min(1, "Explanation is required"),
  codeSnippet: z.string().optional(),
});

// ── Helper: verify project belongs to team ────────────────────────────────────
async function verifyProjectInTeam(projectId: string, teamId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, teamId },
  });
}

// ── GET entries ───────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const project = await verifyProjectInTeam(
    req.params.projectId,
    req.params.teamId
  );
  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const entries = await prisma.solutionEntry.findMany({
    where: { projectId: req.params.projectId },
    include: { author: true },
    orderBy: { createdAt: "desc" },
  });

  res.json(
    entries.map((e) => ({
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
    }))
  );
});

// ── POST entry ────────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parse = entrySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const project = await verifyProjectInTeam(
    req.params.projectId,
    req.params.teamId
  );
  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const entry = await prisma.solutionEntry.create({
    data: {
      projectId: req.params.projectId,
      authorId: req.user!.userId,
      title: parse.data.title,
      module: parse.data.module,
      status: parse.data.status,
      errorMessage: parse.data.errorMessage ?? null,
      explanation: parse.data.explanation,
      codeSnippet: parse.data.codeSnippet ?? null,
    },
    include: { author: true },
  });

  res.status(201).json({
    id: entry.id,
    title: entry.title,
    module: entry.module,
    status: entry.status,
    errorMessage: entry.errorMessage,
    explanation: entry.explanation,
    codeSnippet: entry.codeSnippet,
    createdAt: entry.createdAt,
    author: entry.author
      ? { id: entry.author.id, name: entry.author.name, avatar: entry.author.avatar }
      : null,
  });
});

// ── PATCH entry ───────────────────────────────────────────────────────────────
router.patch("/:entryId", async (req: Request, res: Response) => {
  const parse = entrySchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  // Only the author or a team leader can update
  const entry = await prisma.solutionEntry.findFirst({
    where: { id: req.params.entryId, projectId: req.params.projectId },
  });

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const isAuthor = entry.authorId === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === Role.TEAM_LEADER ||
    req.user?.globalRole === Role.SUPER_ADMIN;

  if (!isAuthor && !isLeaderOrAbove) {
    res.status(403).json({ error: "Only the author or a team leader can edit entries" });
    return;
  }

  const updated = await prisma.solutionEntry.update({
    where: { id: req.params.entryId },
    data: {
      ...parse.data,
      errorMessage: parse.data.errorMessage ?? undefined,
      codeSnippet: parse.data.codeSnippet ?? undefined,
    },
    include: { author: true },
  });

  res.json({
    id: updated.id,
    title: updated.title,
    module: updated.module,
    status: updated.status,
    createdAt: updated.createdAt,
  });
});

// ── DELETE entry ──────────────────────────────────────────────────────────────
router.delete("/:entryId", async (req: Request, res: Response) => {
  const entry = await prisma.solutionEntry.findFirst({
    where: { id: req.params.entryId, projectId: req.params.projectId },
  });

  if (!entry) {
    res.status(404).json({ error: "Entry not found" });
    return;
  }

  const isAuthor = entry.authorId === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === Role.TEAM_LEADER ||
    req.user?.globalRole === Role.SUPER_ADMIN;

  if (!isAuthor && !isLeaderOrAbove) {
    res.status(403).json({ error: "Only the author or a team leader can delete entries" });
    return;
  }

  await prisma.solutionEntry.delete({ where: { id: req.params.entryId } });
  res.json({ message: "Entry deleted" });
});

export default router;
