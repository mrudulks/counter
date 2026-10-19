import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../utils/HttpError';

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new HttpError(404, 'Route not found'));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: Object.values(err.errors)[0]?.message ?? 'Validation failed' });
  }
  if (typeof err === 'object' && err && (err as { code?: number }).code === 11000) {
    const field = Object.keys((err as { keyValue?: object }).keyValue ?? {}).pop() ?? 'value';
    return res.status(409).json({ message: `A record with this ${field} already exists` });
  }
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
}
