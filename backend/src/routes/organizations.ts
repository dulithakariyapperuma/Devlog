import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authMiddleware } from "../middleware/auth";
import { requireOrgAdmin, requireOrgRole } from "../middleware/requireRole";
import { OrgRole, TeamRole } from "@prisma/client";

const router = Router();
router.use(authMiddleware);

const createOrgSchema = z.object({
  name: z.string().min(2),
});

const createTeamSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
});

function makeSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") +
    "-" +
    Date.now()
  );
}

// ── GET /api/organizations ────────────────────────────────────────────────────
// Only Super Admins can list all organizations globally
router.get("/", async (req: Request, res: Response) => {
  if (req.user!.globalRole !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Forbidden. Only Super Admins can list all organizations." });
    return;
  }
  const orgs = await prisma.organization.findMany();
  res.json(orgs);
});

// ── POST /api/organizations ───────────────────────────────────────────────────
// Only Super Admins can create new organizations
router.post("/", async (req: Request, res: Response) => {
  if (req.user!.globalRole !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Forbidden. Only Super Admins can create organizations." });
    return;
  }
  
  const parse = createOrgSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name } = parse.data;

  // Use a transaction to create the org and assign the super admin as the owner
  const org = await prisma.$transaction(async (tx) => {
    const newOrg = await tx.organization.create({
      data: {
        name,
        slug: makeSlug(name),
      },
    });

    await tx.orgMembership.create({
      data: {
        organizationId: newOrg.id,
        userId: req.user!.userId,
        role: OrgRole.ORG_OWNER,
      },
    });

    return newOrg;
  });

  res.status(201).json(org);
});

// ── GET /api/organizations/:orgId ─────────────────────────────────────────────
router.get("/:orgId", requireOrgRole(), async (req: Request, res: Response) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.orgId },
    include: {
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      },
    },
  });

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json({
    id: org.id,
    name: org.name,
    slug: org.slug,
    createdAt: org.createdAt,
    members: org.memberships.map((m) => ({
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
});

// ── GET /api/organizations/:orgId/teams ───────────────────────────────────────
router.get("/:orgId/teams", requireOrgRole(), async (req: Request, res: Response) => {
  const teams = await prisma.team.findMany({
    where: { organizationId: req.params.orgId },
    include: {
      _count: { select: { memberships: true, projects: true } },
    },
  });

  res.json(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      createdAt: t.createdAt,
      memberCount: t._count.memberships,
      projectCount: t._count.projects,
    }))
  );
});

// ── POST /api/organizations/:orgId/teams ──────────────────────────────────────
router.post("/:orgId/teams", requireOrgAdmin, async (req: Request, res: Response) => {
  const parse = createTeamSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten().fieldErrors });
    return;
  }

  const { name, description } = parse.data;

  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        organizationId: req.params.orgId,
        name,
        slug: makeSlug(name),
        description,
      },
    });

    // Make the creator a TEAM_OWNER automatically
    await tx.teamMembership.create({
      data: {
        teamId: newTeam.id,
        userId: req.user!.userId,
        role: TeamRole.TEAM_OWNER,
      },
    });

    return newTeam;
  });

  res.status(201).json(team);
});

export default router;
