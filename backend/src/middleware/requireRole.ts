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
import { Role } from "@prisma/client";
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
  if (req.user.globalRole !== Role.SUPER_ADMIN) {
    res.status(403).json({ error: "Super admin access required" });
    return;
  }
  next();
}

/**
 * Requires the user to be a member of the team in :teamId.
 * Optionally also checks that their role is in allowedRoles.
 *
 * Super admins bypass this check and always pass.
 * Also attaches req.teamRole for use in route handlers.
 */
export function requireTeamMembership(
  allowedRoles: Role[] = [Role.MEMBER, Role.TEAM_LEADER, Role.SUPER_ADMIN]
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Super admins can access any team
    if (req.user.globalRole === Role.SUPER_ADMIN) {
      req.teamRole = Role.SUPER_ADMIN;
      next();
      return;
    }

    const { teamId } = req.params;
    if (!teamId) {
      res.status(400).json({ error: "teamId param is required" });
      return;
    }

    try {
      const membership = await prisma.teamMembership.findUnique({
        where: {
          teamId_userId: {
            teamId,
            userId: req.user.userId,
          },
        },
      });

      if (!membership) {
        res.status(403).json({ error: "You are not a member of this team" });
        return;
      }

      if (!allowedRoles.includes(membership.role)) {
        res.status(403).json({
          error: `This action requires one of: ${allowedRoles.join(", ")}`,
        });
        return;
      }

      // Attach role so route handlers can use it without another DB call
      req.teamRole = membership.role;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Shorthand for TEAM_LEADER-only routes */
export const requireTeamLeader = requireTeamMembership([
  Role.TEAM_LEADER,
  Role.SUPER_ADMIN,
]);
