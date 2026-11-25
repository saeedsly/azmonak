import type { NextFunction, Request, Response } from 'express';
import { verifySession } from '../lib/auth.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export const SESSION_COOKIE = 'azm_session';

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

export function readSessionToken(req: Request): string | null {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE]) return cookies[SESSION_COOKIE];
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = readSessionToken(req);
  if (!token) {
    next(unauthorized());
    return;
  }
  try {
    req.user = await verifySession(token);
    next();
  } catch {
    next(unauthorized('نشست شما منقضی شده است؛ دوباره وارد شوید.'));
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (roles.length && !roles.includes(req.user.role)) {
      next(forbidden('سطح دسترسی شما کافی نیست.'));
      return;
    }
    next();
  };
}
