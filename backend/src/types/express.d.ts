/**
 * src/types/express.d.ts
 * ─────────────────────────────────────────────────────
 * Augments Express's Request interface to add our custom
 * `user` and `teamRole` properties, set by middleware.
 *
 * This gives us TypeScript autocomplete and type safety
 * throughout all route handlers without any casting.
 */
import { OrgRole, TeamRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by authMiddleware after JWT verification */
      user?: {
        userId: string;
        email: string;
        globalRole: string | null;
      };
      /** Set by requireTeamRole middleware */
      teamRole?: TeamRole;
      /** Set by requireOrgRole middleware */
      orgRole?: OrgRole;
    }
  }
}
