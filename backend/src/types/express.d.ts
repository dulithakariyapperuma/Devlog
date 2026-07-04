/**
 * src/types/express.d.ts
 * ─────────────────────────────────────────────────────
 * Augments Express's Request interface to add our custom
 * `user` and `teamRole` properties, set by middleware.
 *
 * This gives us TypeScript autocomplete and type safety
 * throughout all route handlers without any casting.
 */
import { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by authMiddleware after JWT verification */
      user?: {
        userId: string;
        email: string;
        globalRole: Role | null;
      };
      /** Set by requireTeamMembership middleware */
      teamRole?: Role;
    }
  }
}
