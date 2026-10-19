import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User, UserDoc, Role } from '../models/User';
import { HttpError } from '../utils/HttpError';

declare global {
  namespace Express {
    interface Request {
      user?: UserDoc;
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new HttpError(401, 'Not authenticated');

  let payload: { sub: string };
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret) as { sub: string };
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }

  const user = (await User.findById(payload.sub)) as UserDoc | null;
  if (!user || !user.isActive) throw new HttpError(401, 'Account not found or disabled');

  req.user = user;
  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as Role)) {
      throw new HttpError(403, 'You do not have permission to do this');
    }
    next();
  };
}

/** Ensures the user may access :restaurantId. Superadmin can access any restaurant. */
export function restaurantAccess(req: Request, _res: Response, next: NextFunction) {
  const { restaurantId } = req.params;
  const user = req.user!;
  if (user.role !== 'superadmin' && String(user.restaurant) !== restaurantId) {
    throw new HttpError(403, 'You do not have access to this restaurant');
  }
  next();
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] });
}

/** :restaurantId from a parent mount path (child routers use mergeParams). */
export function restaurantIdOf(req: Request): string {
  return (req.params as Record<string, string>).restaurantId;
}
