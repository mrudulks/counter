import { Request, Response, NextFunction } from 'express';
import { z, ZodType } from 'zod';
import { HttpError } from '../utils/HttpError';

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

export function validateBody(schema: ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const path = issue.path.join('.');
      throw new HttpError(400, path ? `${path}: ${issue.message}` : issue.message);
    }
    req.body = result.data;
    next();
  };
}
