import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../lib/jwt";
import { UnauthorizedError, ForbiddenError } from "../lib/errors";

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next(new UnauthorizedError("Missing or invalid token"));
  }

  const token = authHeader.split(" ")[1];
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireRole(...roles: Array<"ADMIN" | "TEAM">) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError("Insufficient permissions"));
    }
    next();
  };
}
