/**
 * src/routes/auth.ts
 * ─────────────────────────────────────────────────────
 * Authentication routes.
 *
 * POST /api/auth/register        — create account (no team)
 * POST /api/auth/register-leader — create account + new team (becomes TEAM_LEADER)
 * POST /api/auth/login           — login, returns JWT + user info
 * GET  /api/auth/me              — get current user profile (requires auth)
 * PATCH /api/auth/me             — update name / avatar (requires auth)
 */
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── Validation Schemas (Zod) ──────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerLeaderSchema = registerSchema.extend({
  teamName: z.string().min(2, "Team name must be at least 2 characters"),
  teamDescription: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().max(4).optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeAvatar(name: string): string {
  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function makeSlug(teamName: string): string {
  return (
    teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now()
  );
}

function signToken(userId: string, email: string, globalRole: Role | null) {
  return jwt.sign(
    { userId, email, globalRole },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "7d" }
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Register a plain member (no team yet).
 * They'll join a team by invitation or by team slug.
 */
router.post("/register", async (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, avatar: makeAvatar(name) },
  });

  const token = signToken(user.id, user.email, null);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      globalRole: user.globalRole,
      teams: [],
    },
  });
});

// ── POST /api/auth/register-leader ───────────────────────────────────────────
/**
 * Register and simultaneously create a new team.
 * The registering user automatically becomes TEAM_LEADER.
 * This is done in a DB transaction — if anything fails,
 * no partial data is saved.
 */
router.post("/register-leader", async (req: Request, res: Response) => {
  const parse = registerLeaderSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password, teamName, teamDescription } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // $transaction = if any step fails, ALL steps are rolled back
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, avatar: makeAvatar(name) },
    });

    const team = await tx.team.create({
      data: {
        name: teamName,
        slug: makeSlug(teamName),
        description: teamDescription,
      },
    });

    const membership = await tx.teamMembership.create({
      data: { userId: user.id, teamId: team.id, role: Role.TEAM_LEADER },
    });

    return { user, team, membership };
  });

  const token = signToken(result.user.id, result.user.email, null);

  res.status(201).json({
    token,
    user: {
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      avatar: result.user.avatar,
      globalRole: result.user.globalRole,
      teams: [
        {
          id: result.team.id,
          name: result.team.name,
          slug: result.team.slug,
          role: Role.TEAM_LEADER,
        },
      ],
    },
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: { include: { team: true } },
    },
  });

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  // Update status to online in all their teams
  await prisma.teamMembership.updateMany({
    where: { userId: user.id },
    data: { status: "online" },
  });

  const token = signToken(user.id, user.email, user.globalRole);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      globalRole: user.globalRole,
      teams: user.memberships.map((m) => ({
        id: m.team.id,
        name: m.team.name,
        slug: m.team.slug,
        role: m.role,
      })),
    },
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { memberships: { include: { team: true } } },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    globalRole: user.globalRole,
    teams: user.memberships.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      slug: m.team.slug,
      role: m.role,
      status: m.status,
    })),
  });
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────
router.patch("/me", authMiddleware, async (req: Request, res: Response) => {
  const parse = updateMeSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: parse.data,
  });

  res.json({ id: user.id, name: user.name, email: user.email, avatar: user.avatar });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  // Mark user as offline in all their teams
  await prisma.teamMembership.updateMany({
    where: { userId: req.user!.userId },
    data: { status: "offline" },
  });
  res.json({ message: "Logged out successfully" });
});

export default router;
