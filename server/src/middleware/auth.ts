import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';
import { HttpError } from '../lib/http.js';

const SECRET = process.env.JWT_SECRET || 'dev-only-change-me-foodwise-secret';

export interface AuthUser { id: string; role: Role; name: string }
declare global { namespace Express { interface Request { user?: AuthUser } } }

export const signToken = (u: AuthUser) => jwt.sign(u, SECRET, { expiresIn: '7d' });

function readToken(req: Request): AuthUser | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try {
    const p = jwt.verify(h.slice(7), SECRET) as AuthUser;
    return { id: p.id, role: p.role, name: p.name };
  } catch { return null; }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  req.user = readToken(req) ?? undefined;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const u = readToken(req);
  if (!u) return next(new HttpError(401, 'Please sign in to continue'));
  req.user = u;
  next();
}

export const requireRole = (...roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, 'Please sign in to continue'));
  if (!roles.includes(req.user.role)) return next(new HttpError(403, `Only ${roles.join(' / ').toLowerCase()} accounts can do this`));
  next();
};
