import { Router } from 'express';
import { createUserSchema } from '@azmoonak/shared';
import { getDb } from '../../db/index.js';
import {
  createUser,
  listUsers,
  logAudit,
  setSetting,
  getSetting,
  updateUser,
} from '../../db/repos.js';
import { mapUser } from '../../db/mappers.js';
import { badRequest, conflict, notFound } from '../../lib/errors.js';
import { hashPassword } from '../../lib/auth.js';
import { parseSafe } from '../../middleware/error.js';
import { aiStatus } from '../../services/ai.js';
import { config } from '../../config.js';

export const systemRouter = Router();

systemRouter.get('/overview', async (_req, res) => {
  const db = await getDb();

  const [courses, exams, published, questions, attempts, answers] = await Promise.all([
    db.selectFrom('courses').select((eb) => eb.fn.countAll<number>().as('c')).executeTakeFirst(),
    db.selectFrom('exams').select((eb) => eb.fn.countAll<number>().as('c')).executeTakeFirst(),
    db
      .selectFrom('exams')
      .select((eb) => eb.fn.countAll<number>().as('c'))
      .where('status', '=', 'PUBLISHED')
      .executeTakeFirst(),
    db.selectFrom('questions').select((eb) => eb.fn.countAll<number>().as('c')).executeTakeFirst(),
    db.selectFrom('attempts').select((eb) => eb.fn.countAll<number>().as('c')).executeTakeFirst(),
    db.selectFrom('answers').select((eb) => eb.fn.countAll<number>().as('c')).executeTakeFirst(),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const today = await db
    .selectFrom('attempts')
    .select((eb) => eb.fn.countAll<number>().as('c'))
    .where('createdAt', '>=', todayStart.getTime())
    .executeTakeFirst();

  const recent = await db
    .selectFrom('attempts')
    .innerJoin('exams', 'exams.id', 'attempts.examId')
    .selectAll('attempts')
    .select('exams.title as examTitle')
    .orderBy('attempts.createdAt', 'desc')
    .limit(8)
    .execute();

  const topExams = await db
    .selectFrom('exams')
    .leftJoin('attempts', 'attempts.examId', 'exams.id')
    .selectAll('exams')
    .select((eb) => eb.fn.count<number>('attempts.id').as('attemptCount'))
    .groupBy('exams.id')
    .orderBy('attemptCount', 'desc')
    .limit(5)
    .execute();

  res.json({
    totals: {
      courses: Number(courses?.c ?? 0),
      exams: Number(exams?.c ?? 0),
      published: Number(published?.c ?? 0),
      questions: Number(questions?.c ?? 0),
      attempts: Number(attempts?.c ?? 0),
      answers: Number(answers?.c ?? 0),
      attemptsToday: Number(today?.c ?? 0),
    },
    recent: recent.map((row) => ({
      id: row.id,
      examTitle: (row as never as { examTitle: string }).examTitle,
      participantName: row.participantName,
      status: row.status,
      score: row.score / 100,
      maxScore: row.maxScore / 100,
      createdAt: row.createdAt,
    })),
    topExams: topExams.map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      attemptCount: Number((row as never as { attemptCount: number }).attemptCount ?? 0),
    })),
  });
});

systemRouter.get('/settings', async (_req, res) => {
  const db = await getDb();
  const branding = (await getSetting(db, 'branding')) ?? {
    appName: config.appName,
    tagline: 'سامانه آزمون آنلاین و نظرسنجی',
    logoUrl: '',
    primaryColor: '#4f46e5',
    supportText: 'برای راهنمایی با پشتیبانی تماس بگیرید.',
    footerText: '',
  };
  res.json({
    branding,
    ai: aiStatus(),
    db: { mode: config.db.mode },
    appName: config.appName,
  });
});

systemRouter.put('/settings', async (req, res) => {
  if (req.user?.role !== 'ADMIN') throw badRequest('فقط مدیر کل می‌تواند تنظیمات را تغییر دهد.');
  const db = await getDb();
  const body = (req.body ?? {}) as Record<string, unknown>;
  const current = ((await getSetting(db, 'branding')) ?? {}) as Record<string, unknown>;
  const next = { ...current };
  for (const key of ['appName', 'tagline', 'logoUrl', 'primaryColor', 'supportText', 'footerText']) {
    if (typeof body[key] === 'string') next[key] = body[key] as string;
  }
  await setSetting(db, 'branding', next);
  await logAudit(db, {
    userId: req.user?.sub ?? null,
    action: 'UPDATE_SETTINGS',
    entity: 'settings',
    entityId: 'branding',
    ip: req.ip,
  });
  res.json({ branding: next });
});

systemRouter.get('/users', async (_req, res) => {
  const db = await getDb();
  const rows = await listUsers(db);
  res.json({ items: rows.map(mapUser) });
});

systemRouter.post('/users', async (req, res) => {
  if (req.user?.role !== 'ADMIN') throw badRequest('فقط مدیر کل می‌تواند کاربر جدید بسازد.');
  const input = parseSafe(createUserSchema, req.body);
  const db = await getDb();
  const existing = await db
    .selectFrom('users')
    .select('id')
    .where('username', '=', input.username)
    .executeTakeFirst();
  if (existing) throw conflict('این نام کاربری قبلاً ثبت شده است.');

  const row = await createUser(db, {
    username: input.username,
    email: input.email || null,
    passwordHash: await hashPassword(input.password),
    fullName: input.fullName,
    role: input.role,
  });
  res.status(201).json(mapUser(row));
});

systemRouter.patch('/users/:id', async (req, res) => {
  if (req.user?.role !== 'ADMIN') throw badRequest('فقط مدیر کل می‌تواند کاربران را ویرایش کند.');
  const body = (req.body ?? {}) as Record<string, unknown>;
  const db = await getDb();
  const target = await db.selectFrom('users').selectAll().where('id', '=', req.params.id).executeTakeFirst();
  if (!target) throw notFound('کاربر یافت نشد.');

  const patch: Record<string, unknown> = {};
  if (typeof body.role === 'string') patch.role = body.role;
  if (body.isActive !== undefined) patch.isActive = body.isActive ? 1 : 0;
  if (typeof body.fullName === 'string') patch.fullName = body.fullName;
  if (typeof body.password === 'string' && body.password.length >= 8) {
    patch.passwordHash = await hashPassword(body.password as string);
  }
  await updateUser(db, target.id, patch as never);
  const updated = await db.selectFrom('users').selectAll().where('id', '=', target.id).executeTakeFirst();
  res.json(mapUser(updated!));
});
