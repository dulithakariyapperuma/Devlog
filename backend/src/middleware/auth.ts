/**
 * src/middleware/auth.ts
 * ─────────────────────────────────────────────────────
 * JWT authentication middleware.
 *
 * Usage in routes:
 *   router.get('/protected', authMiddleware, handler)
 *
 * What it does:
 *   1. Reads the Authorization header: "Bearer <token>"
 *   2. Verifies the JWT signature with JWT_SECRET
 *   3. Attaches the decoded payload to req.user
 *   4. Calls next() if valid, or returns 401 if invalid
 *
 * CS Learning Note:
 *   JWT = JSON Web Token. It's a signed string that proves
 *   who the user is without hitting the database every request.
 *   Structure: header.payload.signature (all base64-encoded)
 */
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JWTPayload {
  userId: string;
  email: string;
  globalRole: string | null;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 1. Get the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  // 2. Extract the token (the part after "Bearer ")
  const token = authHeader.split(" ")[1];

  try {
    // 3. Verify and decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // 4. Attach to request for downstream use
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      globalRole: decoded.globalRole,
    };

    next();
  } catch (err) {
    // Token is invalid or expired
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
