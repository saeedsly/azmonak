import { Router, type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { startAttemptSchema, answerUpsertSchema } from '@azmoonak/shared';
import { getDb } from '../db/index.js';
import {
  countAttemptsForIdentity,
  createAttempt,
  getAttempt,
  getSetting,
  incrementInviteUsage,
  listQuestions,
  upsertParticipant,
} from '../db/repos.js';
import { config } from '../config.js';
import { verifyAttemptToken } from '../lib/auth.js';
import { badRequest, forbidden, notFound, unauthorized } from '../lib/errors.js';
import { resolveAccessCode } from '../services/access.js';
import { finalizeAttempt, loadAttemptBundle, saveAnswer } from '../services/attemptService.js';
import { buildResult, toPublicQuestion } from '../services/publicView.js';
import { shuffleWithSeed } from '../lib/shuffle.js';
import { newId, nowMs } from '../db/index.js';
import { parseSafe } from '../middleware/error.js';
import { uploadSingle } from '../middleware/upload.js';
import { saveBuffer } from '../services/storage.js';

export const publicRouter = Router();

const accessLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

const startLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.' },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'تعداد درخواست‌ها بیش از حد مجاز است.' },
});

function attemptToken(req: Request): string | null {
  const header = req.headers['x-attempt-token'];
  if (typeof header === 'string' && header) return header;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

async function requireAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = attemptToken(req);
    if (!token) throw unauthorized('دسترسی به این تلاش معتبر نیست.');
    const { attemptId } = await verifyAttemptToken(token).catch(() => {
      throw unauthorized('نشست شما منقضی شده است؛ لطفاً آزمون را دوباره شروع کنید.');
    });
    if (attemptId !== req.params.id) throw forbidden('این تلاش متعلق به شما نیست.');
    const db = await getDb();
    const attempt = await getAttempt(db, attemptId);
    if (!attempt) throw notFound('تلاش موردنظر یافت نشد.');
    (req as Request & { attemptId?: string }).attemptId = attemptId;
    next();
  } catch (error) {
    next(error);
  }
}

/* ------------------------------- بارگذاری فایل ------------------------------- */

publicRouter.post(
  '/attempts/:id/upload',
  writeLimiter,
  requireAttempt,
  uploadSingle,
  async (req, res) => {
    const file = req.file;
    if (!file) throw badRequest('فایلی انتخاب نشده است.');
    const stored = await saveBuffer(file.buffer, file.mimetype, file.originalname);
    res.status(201).json(stored);
  },
);

/* ------------------------------- بررسی کد دسترسی ------------------------------ */

publicRouter.get('/settings', async (_req, res) => {
  const db = await getDb();
  const branding = (await getSetting(db, 'branding')) ?? {
    appName: config.appName,
    tagline: 'سامانه آزمون آنلاین و نظرسنجی',
    logoUrl: '',
    primaryColor: '#4f46e5',
    supportText: '',
    footerText: '',
  };
  res.json({ branding });
});

publicRouter.post('/resolve', accessLimiter, async (req, res) => {
  const code = String(req.body?.code ?? '');
  const db = await getDb();
  const { exam, identityRequired } = await resolveAccessCode(db, code);
  const questions = await listQuestions(db, exam.id);
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  res.json({
    exam: {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      instructions: exam.instructions,
      type: exam.type,
      durationMinutes: exam.durationMinutes,
      questionCount: questions.length,
      totalPoints: Math.round(totalPoints / 100),
      passScore: exam.passScore,
      requires: identityRequired,
      allowAnonymous: exam.allowAnonymous === 1,
      startAt: exam.startAt,
      endAt: exam.endAt,
    },
  });
});

/* --------------------------------- شروع آزمون -------------------------------- */

publicRouter.post('/attempts', startLimiter, async (req, res) => {
  const input = parseSafe(startAttemptSchema, req.body);
  const db = await getDb();
  const { exam, invite } = await resolveAccessCode(db, input.accessCode);

  const requires = {
    name: exam.requireName === 1,
    email: exam.requireEmail === 1,
    phone: exam.requirePhone === 1,
    nationalCode: exam.requireNationalCode === 1,
  };

  const identityProvided = !!(input.name || input.email || input.nationalCode || input.phone);
  if (exam.allowAnonymous === 1 && exam.type !== 'EXAM') {
    // در نظرسنجی می‌توان بدون مشخصات شرکت کرد.
  } else {
    if (requires.name && !input.name.trim()) throw badRequest('نام و نام خانوادگی را وارد کنید.');
    if (requires.email && !input.email.trim()) throw badRequest('ایمیل را وارد کنید.');
    if (requires.phone && !input.phone.trim()) throw badRequest('شماره تماس را وارد کنید.');
    if (requires.nationalCode && !input.nationalCode.trim()) {
      throw badRequest('کد ملی را وارد کنید.');
    }
  }
  void identityProvided;

  if (exam.maxAttempts > 0) {
    const used = await countAttemptsForIdentity(db, exam.id, {
      name: input.name,
      email: input.email,
      nationalCode: input.nationalCode,
    });
    if (used >= exam.maxAttempts) {
      throw forbidden('حداکثر تعداد شرکت در این آزمون را استفاده کرده‌اید.');
    }
  }

  const questions = await listQuestions(db, exam.id);
  const maxScore = questions.reduce((sum, question) => sum + question.points, 0);
  const now = nowMs();
  const expiresAt = exam.durationMinutes > 0 ? now + exam.durationMinutes * 60_000 : null;

  const isAnonymous = exam.allowAnonymous === 1 && exam.type !== 'EXAM';

  let participantId: string | null = null;
  if (!isAnonymous && (input.name.trim() || input.email.trim())) {
    const participant = await upsertParticipant(db, {
      fullName: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      nationalCode: input.nationalCode.trim(),
      meta: (input.meta ?? {}) as Record<string, unknown>,
    });
    participantId = participant.id;
  }

  const attemptId = newId();
  await createAttempt(db, {
    id: attemptId,
    examId: exam.id,
    participantId,
    // در نظرسنجی ناشناس، هیچ اطلاعات هویتی ذخیره نمی‌شود.
    participantName: isAnonymous ? '' : input.name.trim(),
    participantEmail: isAnonymous ? '' : input.email.trim(),
    participantPhone: isAnonymous ? '' : input.phone.trim(),
    participantNationalCode: isAnonymous ? '' : input.nationalCode.trim(),
    isAnonymous: isAnonymous ? 1 : 0,
    status: 'IN_PROGRESS',
    startedAt: now,
    expiresAt,
    submittedAt: null,
    durationUsedSec: null,
    score: 0,
    maxScore,
    passed: null,
    accessCodeUsed: input.accessCode.trim().toUpperCase(),
    ip: req.ip ?? '',
    userAgent: String(req.headers['user-agent'] ?? '').slice(0, 180),
    gradedBy: null,
    gradedAt: null,
    gradingNotes: '',
    createdAt: now,
    updatedAt: now,
  });

  if (invite) await incrementInviteUsage(db, invite.id);

  const { signAttemptToken } = await import('../lib/auth.js');
  const token = await signAttemptToken(attemptId, exam.id);

  res.json({
    attemptId,
    token,
    expiresAt,
    serverTime: now,
    durationMinutes: exam.durationMinutes,
    examTitle: exam.title,
  });
});

/* ------------------------------- وضعیت تلاش --------------------------------- */

publicRouter.get('/attempts/:id', writeLimiter, requireAttempt, async (req, res) => {
  const db = await getDb();
  const attemptId = (req as Request & { attemptId: string }).attemptId;
  let bundle = await loadAttemptBundle(db, attemptId);
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');

  // پایان زمان: ارسال خودکار
  if (
    bundle.attempt.status === 'IN_PROGRESS' &&
    bundle.attempt.expiresAt &&
    bundle.attempt.expiresAt < nowMs()
  ) {
    bundle = (await finalizeAttempt(db, attemptId, { note: 'ارسال خودکار به دلیل پایان زمان' })) ?? bundle;
  }

  const { attempt, exam } = bundle;
  let questions = bundle.questions;
  if (exam.shuffleQuestions === 1) {
    questions = shuffleWithSeed(questions, `${attempt.id}:q`);
  }
  if (exam.shuffleOptions === 1) {
    questions = questions.map((question) => ({
      ...question,
      options: JSON.stringify(
        shuffleWithSeed(
          JSON.parse(question.options || '[]') as Array<{ id: string; text: string; isCorrect: boolean; order: number }>,
          `${attempt.id}:${question.id}`,
        ),
      ),
    }));
  }

  res.json({
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt,
      expiresAt: attempt.expiresAt,
      submittedAt: attempt.submittedAt,
      participantName: attempt.participantName,
    },
    exam: {
      id: exam.id,
      title: exam.title,
      type: exam.type,
      durationMinutes: exam.durationMinutes,
      showResultImmediately: exam.showResultImmediately === 1,
    },
    questions: questions.map(toPublicQuestion),
    answers: bundle.answers.map((answer) => ({
      questionId: answer.questionId,
      value: JSON.parse(answer.value || 'null'),
    })),
    serverTime: nowMs(),
  });
});

/* ------------------------------- ذخیره پاسخ --------------------------------- */

publicRouter.put(
  '/attempts/:id/answers/:questionId',
  writeLimiter,
  requireAttempt,
  async (req, res) => {
    const db = await getDb();
    const attemptId = (req as Request & { attemptId: string }).attemptId;
    const input = parseSafe(answerUpsertSchema, req.body);
    const attempt = await getAttempt(db, attemptId);
    if (!attempt) throw notFound('تلاش موردنظر یافت نشد.');
    if (attempt.status !== 'IN_PROGRESS') throw forbidden('این آزمون قبلاً به پایان رسیده است.');
    if (attempt.expiresAt && attempt.expiresAt < nowMs()) {
      await finalizeAttempt(db, attemptId, { note: 'ارسال خودکار به دلیل پایان زمان' });
      throw forbidden('زمان آزمون به پایان رسیده است.');
    }

    const questions = await listQuestions(db, attempt.examId);
    const question = questions.find((item) => item.id === req.params.questionId);
    if (!question) throw notFound('سوال موردنظر یافت نشد.');

    await saveAnswer(db, attemptId, question.id, input.value);
    res.json({ ok: true, savedAt: nowMs() });
  },
);

/* --------------------------------- ارسال پاسخ -------------------------------- */

publicRouter.post('/attempts/:id/submit', writeLimiter, requireAttempt, async (req, res) => {
  const db = await getDb();
  const attemptId = (req as Request & { attemptId: string }).attemptId;
  const bundle = await finalizeAttempt(db, attemptId, { note: 'ارسال توسط فراگیر' });
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');
  res.json({ result: buildResult(bundle, { includeDetails: true }) });
});

publicRouter.get('/attempts/:id/result', writeLimiter, requireAttempt, async (req, res) => {
  const db = await getDb();
  const attemptId = (req as Request & { attemptId: string }).attemptId;
  let bundle = await loadAttemptBundle(db, attemptId);
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');
  if (bundle.attempt.status === 'IN_PROGRESS') {
    bundle = (await finalizeAttempt(db, attemptId, { note: 'دریافت نتیجه' })) ?? bundle;
  }
  res.json({ result: buildResult(bundle, { includeDetails: true }) });
});
