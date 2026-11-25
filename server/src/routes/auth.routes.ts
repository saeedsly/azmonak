import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { changePasswordSchema, loginSchema } from '@azmoonak/shared';
import { getDb } from '../db/index.js';
import { findUserById, findUserByUsername, logAudit, touchUserLogin, updateUser } from '../db/repos.js';
import { mapUser } from '../db/mappers.js';
import { hashPassword, signSession, verifyPassword } from '../lib/auth.js';
import { badRequest, unauthorized } from '../lib/errors.js';
import { config } from '../config.js';
import { requireAuth, SESSION_COOKIE } from '../middleware/auth.js';
import { parseSafe } from '../middleware/error.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

authRouter.post('/login', loginLimiter, async (req, res) => {
  const input = parseSafe(loginSchema, req.body);
  const db = await getDb();
  const user = await findUserByUsername(db, input.username.trim());

  if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
    throw unauthorized('نام کاربری یا رمز عبور اشتباه است.');
  }
  if (user.isActive !== 1) {
    throw unauthorized('حساب کاربری شما غیرفعال است.');
  }

  const token = await signSession({
    sub: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
  });

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: config.sessionTtlHours * 3600 * 1000,
  });

  await touchUserLogin(db, user.id);
  await logAudit(db, { userId: user.id, action: 'LOGIN', entity: 'user', entityId: user.id, ip: req.ip });

  res.json({ token, user: mapUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  res.json({ ok: true });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const db = await getDb();
  const user = await findUserById(db, req.user!.sub);
  if (!user) throw unauthorized();
  res.json({ user: mapUser(user) });
});

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const input = parseSafe(changePasswordSchema, req.body);
  const db = await getDb();
  const user = await findUserById(db, req.user!.sub);
  if (!user) throw unauthorized();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw badRequest('رمز عبور فعلی درست نیست.');
  }
  await updateUser(db, user.id, { passwordHash: await hashPassword(input.newPassword) });
  await logAudit(db, {
    userId: user.id,
    action: 'CHANGE_PASSWORD',
    entity: 'user',
    entityId: user.id,
    ip: req.ip,
  });
  res.json({ ok: true });
});
