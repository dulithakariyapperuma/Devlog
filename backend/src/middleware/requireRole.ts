/**
 * src/middleware/requireRole.ts
 * ─────────────────────────────────────────────────────
 * Role-based access control (RBAC) middleware.
 *
 * Three guards provided:
 *
 * 1. requireSuperAdmin  — only SUPER_ADMIN globalRole passes
 * 2. requireTeamMembership(roles?) — user must be in the team
 *    (reads :teamId from route params, hits DB to get role)
 * 3. requireTeamRole(roles) — like above but also checks role
 *
 * CS Learning Note:
 *   This is the "authorization" step (different from authentication!).
 *   Auth = "who are you?" → requireAuth
 *   Authz = "what are you allowed to do?" → requireRole
 */
import { Request, Response, NextFunction } from "express";
import { OrgRole, TeamRole } from "@prisma/client";
import { prisma } from "../lib/prisma";

/** Only allows requests from users with globalRole = SUPER_ADMIN */
export function requireSuperAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (req.user.globalRole !== "SUPER_ADMIN") {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}

/**
 * Middleware to require a user to have a specific role within an ORGANIZATION.
 * Also passes if the user is a global SUPER_ADMIN.
 */
export function requireOrgRole(allowedRoles?: OrgRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Global super admin bypass
      if (req.user.globalRole === "SUPER_ADMIN") {
        req.orgRole = "SUPER_ADMIN" as any;
        next();
        return;
      }

      const orgId = req.params.orgId || req.body.organizationId;
      if (!orgId) {
        res.status(400).json({ error: "organizationId is required" });
        return;
      }

      const membership = await prisma.orgMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: orgId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        res.status(403).json({ error: "You are not a member of this organization." });
        return;
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        res.status(403).json({
          error: `This action requires one of: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      req.orgRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Middleware to require a user to have a specific role within a TEAM.
 * Also passes if the user is a global SUPER_ADMIN, or an Org Owner/Admin of the parent org.
 */
export function requireTeamRole(allowedRoles?: TeamRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Global super admin bypass
      if (req.user.globalRole === "SUPER_ADMIN") {
        req.teamRole = "TEAM_ADMIN" as any;
        next();
        return;
      }

      const teamId = req.params.teamId || req.body.teamId;
      if (!teamId) {
        res.status(400).json({ error: "teamId is required" });
        return;
      }

      // Check team membership
      const membership = await prisma.teamMembership.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId,
          },
        },
        include: {
          team: true,
        },
      });

      if (!membership) {
        // Fallback: Check if they are an Org Owner/Admin for the team's organization
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (team) {
          const orgMembership = await prisma.orgMembership.findUnique({
            where: {
              organizationId_userId: {
                organizationId: team.organizationId,
                userId: req.user.userId,
              },
            },
          });
          if (orgMembership && (orgMembership.role === "ORG_OWNER" || orgMembership.role === "ORG_ADMIN")) {
             req.teamRole = "TEAM_ADMIN" as any;
             next();
             return;
          }
        }
        res.status(403).json({ error: "You are not a member of this team." });
        return;
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        res.status(403).json({
          error: `This action requires one of: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      req.teamRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export const requireTeamAdmin = requireTeamRole([TeamRole.TEAM_OWNER, TeamRole.TEAM_ADMIN]);
export const requireOrgAdmin = requireOrgRole([OrgRole.ORG_OWNER, OrgRole.ORG_ADMIN]);
