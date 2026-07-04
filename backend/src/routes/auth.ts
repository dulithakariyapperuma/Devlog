/**
 * src/routes/auth.ts
 * ─────────────────────────────────────────────────────
 * Authentication routes.
 *
 * POST /api/auth/register        — create account (no team)
 * POST /api/auth/login           — login, returns JWT + user info
 * GET  /api/auth/me              — get current user profile (requires auth)
 * PATCH /api/auth/me             — update name / avatar (requires auth)
 * POST /api/auth/logout          — logout
 */
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// ── Validation Schemas (Zod) ──────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  teamName: z.string().min(2, "Team name must be at least 2 characters").optional(),
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

function signToken(userId: string, email: string, globalRole: string | null) {
  return jwt.sign(
    { userId, email, globalRole },
    process.env.JWT_SECRET!,
    { expiresIn: (process.env.JWT_EXPIRES_IN as any) ?? "7d" }
  );
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
/**
 * Register a new user and create their initial Workspace (Organization) and Team.
 */
router.post("/register", async (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, email, password, organizationName, teamName } = parse.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const avatar = makeAvatar(name);

  try {
    // Run everything in a transaction to ensure atomic workspace creation
    const { user, org, team } = await prisma.$transaction(async (tx) => {
      // 1. Create User
      const newUser = await tx.user.create({
        data: { name, email, passwordHash, avatar },
      });

      // 2. Create Organization
      const orgSlug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const newOrg = await tx.organization.create({
        data: { name: organizationName, slug: orgSlug },
      });

      // 3. Make user ORG_ADMIN
      await tx.orgMembership.create({
        data: {
          userId: newUser.id,
          organizationId: newOrg.id,
          role: "ORG_ADMIN",
        },
      });

      // 4. Create initial Team
      const tName = teamName && teamName.trim() ? teamName.trim() : "General";
      const tSlug = tName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
      const newTeam = await tx.team.create({
        data: {
          name: tName,
          slug: tSlug,
          organizationId: newOrg.id,
        },
      });

      // 5. Make user TEAM_ADMIN
      await tx.teamMembership.create({
        data: {
          userId: newUser.id,
          teamId: newTeam.id,
          role: "TEAM_ADMIN",
          status: "online",
        },
      });

      return { user: newUser, org: newOrg, team: newTeam };
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
        organizations: [
          {
            id: org.id,
            name: org.name,
            slug: org.slug,
            role: "ORG_ADMIN",
          },
        ],
        teams: [
          {
            id: team.id,
            organizationId: org.id,
            name: team.name,
            slug: team.slug,
            role: "TEAM_ADMIN",
          },
        ],
      },
    });
  } catch (error) {
    console.error("Workspace creation failed:", error);
    res.status(500).json({ error: "Failed to create workspace" });
  }
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
      orgMemberships: { include: { organization: true } },
      teamMemberships: { include: { team: true } },
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
      organizations: user.orgMemberships.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
      teams: user.teamMemberships.map((m) => ({
        id: m.team.id,
        organizationId: m.team.organizationId,
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
    include: {
      orgMemberships: { include: { organization: true } },
      teamMemberships: { include: { team: true } },
    },
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
    organizations: user.orgMemberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
    teams: user.teamMemberships.map((m) => ({
      id: m.team.id,
      organizationId: m.team.organizationId,
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
