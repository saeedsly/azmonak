import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodType } from 'zod';
import { HttpError } from '../lib/errors.js';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'مسیر موردنظر یافت نشد', path: req.originalUrl });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, code: error.code, details: error.details });
    return;
  }
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'داده‌های ارسالی معتبر نیست', details: flattenZodError(error) });
    return;
  }
  console.error('[azmoonak] unhandled error:', error);
  res.status(500).json({ error: 'خطای داخلی سرور', code: 'INTERNAL' });
}

export function flattenZodError(error: ZodError): Record<string, string> {
  const details: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join('.') : 'form';
    if (!details[key]) details[key] = issue.message;
  }
  return details;
}

export function parseInput<T>(schema: ZodType<T>, value: unknown): T {
  return schema.parse(value);
}

export function parseSafe<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'داده‌های ارسالی معتبر نیست', 'VALIDATION', flattenZodError(result.error));
  }
  return result.data;
}
