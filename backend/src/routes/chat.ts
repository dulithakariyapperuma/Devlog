/**
 * src/routes/chat.ts
 * ─────────────────────────────────────────────────────
 * Per-project group chat messages.
 *
 * GET  /api/teams/:teamId/projects/:projectId/chat          — list messages
 * POST /api/teams/:teamId/projects/:projectId/chat          — send a message
 * DELETE /api/teams/:teamId/projects/:projectId/chat/:msgId — delete (author or leader)
 *
 * Note: For real-time, you'd add Socket.io later.
 * For now, the frontend can poll this endpoint every few seconds.
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

const messageSchema = z.object({
  text: z.string().min(1, "Message cannot be empty").max(2000),
});

// ── GET messages ──────────────────────────────────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  // Support pagination via ?limit=50&before=<timestamp>
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const before = req.query.before ? new Date(String(req.query.before)) : undefined;

  // Verify project is in team
  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, teamId: req.params.teamId },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      projectId: req.params.projectId,
      ...(before && { createdAt: { lt: before } }),
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  res.json(messages);
});

// ── POST message ──────────────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const parse = messageSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const project = await prisma.project.findFirst({
    where: { id: req.params.projectId, teamId: req.params.teamId },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found in this team" });
    return;
  }

  const message = await prisma.chatMessage.create({
    data: {
      projectId: req.params.projectId,
      authorId: req.user!.userId,
      text: parse.data.text,
    },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
    },
  });

  res.status(201).json(message);
});

// ── DELETE message ────────────────────────────────────────────────────────────
router.delete("/:msgId", async (req: Request, res: Response) => {
  const message = await prisma.chatMessage.findFirst({
    where: { id: req.params.msgId, projectId: req.params.projectId },
  });

  if (!message) {
    res.status(404).json({ error: "Message not found" });
    return;
  }

  const isAuthor = message.authorId === req.user!.userId;
  const isLeaderOrAbove =
    req.teamRole === Role.TEAM_LEADER ||
    req.user?.globalRole === Role.SUPER_ADMIN;

  if (!isAuthor && !isLeaderOrAbove) {
    res.status(403).json({ error: "You can only delete your own messages" });
    return;
  }

  await prisma.chatMessage.delete({ where: { id: req.params.msgId } });
  res.json({ message: "Message deleted" });
});

export default router;
