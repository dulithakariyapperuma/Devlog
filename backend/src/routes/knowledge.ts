/**
 * src/routes/knowledge.ts
 * ─────────────────────────────────────────────────────
 * Knowledge Links — embedded Google Docs, Sheets, PDFs etc.
 * No file storage needed! Just store the URL and embed it in the frontend.
 *
 * GET    /api/teams/:teamId/knowledge              — list all links
 * POST   /api/teams/:teamId/knowledge              — add a link
 * PATCH  /api/teams/:teamId/knowledge/:linkId      — update link (owner or leader)
 * DELETE /api/teams/:teamId/knowledge/:linkId      — delete link (owner or leader)
 */
import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireTeamRole } from "../middleware/requireRole";

const router = Router({ mergeParams: true });

router.use(authMiddleware);
router.use(requireTeamRole());

// ── Schemas ───────────────────────────────────────────────────────────────────

const linkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
  type: z
    .enum(["google_sheet", "google_doc", "word_doc", "pdf", "other"])
    .default("other"),
  category: z.string().default("General"),
});

// ── GET all links ─────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  const { type, category } = req.query;

  const links = await prisma.knowledgeLink.findMany({
    where: {
      teamId: req.params.teamId,
      ...(type && { type: String(type) }),
      ...(category && { category: String(category) }),
    },
    include: {
      addedBy: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(links);
});

// ── POST link ─────────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parse = linkSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const link = await prisma.knowledgeLink.create({
    data: {
      teamId: req.params.teamId,
      addedById: req.user!.userId,
      title: parse.data.title,
      url: parse.data.url,
      description: parse.data.description ?? null,
      type: parse.data.type,
      category: parse.data.category,
    },
    include: {
      addedBy: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.status(201).json(link);
});

// ── PATCH link ────────────────────────────────────────────────────────────────
router.patch("/:linkId", async (req: Request, res: Response) => {
  const parse = linkSchema.partial().safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const link = await prisma.knowledgeLink.findUnique({
    where: { id: req.params.linkId },
  });

  if (!link || link.teamId !== req.params.teamId) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const isOwner = link.addedById === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === "TEAM_ADMIN" ||
    req.teamRole === "TEAM_OWNER" ||
    req.user?.globalRole === "SUPER_ADMIN";

  if (!isOwner && !isLeaderOrAbove) {
    res.status(403).json({ error: "Only the link owner or team leader can edit" });
    return;
  }

  const updated = await prisma.knowledgeLink.update({
    where: { id: req.params.linkId },
    data: parse.data,
    include: { addedBy: { select: { id: true, name: true, avatar: true } } },
  });

  res.json(updated);
});

// ── DELETE link ───────────────────────────────────────────────────────────────
router.delete("/:linkId", async (req: Request, res: Response) => {
  const link = await prisma.knowledgeLink.findUnique({
    where: { id: req.params.linkId },
  });

  if (!link || link.teamId !== req.params.teamId) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const isOwner = link.addedById === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === "TEAM_ADMIN" ||
    req.teamRole === "TEAM_OWNER" ||
    req.user?.globalRole === "SUPER_ADMIN";

  if (!isOwner && !isLeaderOrAbove) {
    res.status(403).json({ error: "Only the link owner or team leader can delete" });
    return;
  }

  await prisma.knowledgeLink.delete({ where: { id: req.params.linkId } });
  res.json({ message: "Link deleted" });
});

export default router;
