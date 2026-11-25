import { Router } from 'express';
import { bulkGradeSchema, listQuerySchema, manualGradeSchema } from '@azmoonak/shared';
import { getDb } from '../../db/index.js';
import {
  getAnswer,
  getAttempt,
  getExamWithCourse,
  listAnswers,
  listAttempts,
  listQuestions,
  updateAnswer,
  updateAttempt,
} from '../../db/repos.js';
import { mapAnswer, mapAttempt, mapQuestion } from '../../db/mappers.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { parseSafe } from '../../middleware/error.js';
import { finalizeAttempt, loadAttemptBundle } from '../../services/attemptService.js';
import { computePassed } from '../../services/grading.js';

export const attemptsRouter = Router();

attemptsRouter.get('/', async (req, res) => {
  const query = parseSafe(listQuerySchema, req.query);
  const db = await getDb();
  const { rows, total } = await listAttempts(db, {
    examId: req.query.examId as string | undefined,
    status: req.query.status as string | undefined,
    search: query.search,
    page: query.page,
    pageSize: query.pageSize,
  });
  res.json({
    items: rows.map((row) => ({
      ...mapAttempt(row as never),
      examTitle: (row as never as { examTitle?: string }).examTitle ?? '',
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
});

attemptsRouter.get('/:id', async (req, res) => {
  const db = await getDb();
  const bundle = await loadAttemptBundle(db, req.params.id);
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');
  res.json({
    attempt: mapAttempt(bundle.attempt as never),
    exam: {
      id: bundle.exam.id,
      title: bundle.exam.title,
      type: bundle.exam.type,
      passScore: bundle.exam.passScore,
    },
    questions: bundle.questions.map(mapQuestion),
    answers: bundle.answers.map(mapAnswer),
  });
});

/** تصحیح دستی یک پاسخ تشریحی */
attemptsRouter.post('/:id/grade', async (req, res) => {
  const input = parseSafe(manualGradeSchema, req.body);
  const db = await getDb();
  const answerRow = await getAnswer(db, input.answerId);
  if (!answerRow) throw notFound('پاسخ موردنظر یافت نشد.');

  const bundle = await loadAttemptBundle(db, req.params.id);
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');
  const question = bundle.questions.find((item) => item.id === answerRow.questionId);
  if (!question) throw notFound('سوال موردنظر یافت نشد.');

  const points = Math.min(input.pointsAwarded, question.points / 100);
  await updateAnswer(db, answerRow.id, {
    pointsAwarded: Math.round(points * 100),
    maxPoints: question.points,
    isCorrect: points > 0 ? 1 : 0,
    needsManualGrading: 0,
    feedback: input.feedback,
    gradedBy: req.user?.sub ?? null,
    gradedAt: Date.now(),
  });

  const updated = await finalizeAttempt(db, req.params.id, {
    gradedBy: req.user?.sub ?? null,
    note: 'تصحیح دستی',
  });

  res.json({
    answer: updated ? mapAnswer(updated.answers.find((a) => a.id === answerRow.id)!) : null,
    attempt: updated ? mapAttempt(updated.attempt as never) : null,
  });
});

/** تصحیح گروهی پاسخ‌های یک تلاش */
attemptsRouter.post('/:id/grade-bulk', async (req, res) => {
  const input = parseSafe(bulkGradeSchema, req.body);
  const db = await getDb();
  const bundle = await loadAttemptBundle(db, req.params.id);
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');

  for (const grade of input.grades) {
    const answer = await getAnswer(db, grade.answerId);
    if (!answer || answer.attemptId !== bundle.attempt.id) continue;
    const question = bundle.questions.find((item) => item.id === answer.questionId);
    if (!question) continue;
    const points = Math.min(grade.pointsAwarded, question.points / 100);
    await updateAnswer(db, answer.id, {
      pointsAwarded: Math.round(points * 100),
      maxPoints: question.points,
      isCorrect: points > 0 ? 1 : 0,
      needsManualGrading: 0,
      feedback: grade.feedback,
      gradedBy: req.user?.sub ?? null,
      gradedAt: Date.now(),
    });
  }

  const updated = await finalizeAttempt(db, req.params.id, {
    gradedBy: req.user?.sub ?? null,
    note: 'تصحیح گروهی',
  });
  res.json({ attempt: updated ? mapAttempt(updated.attempt as never) : null });
});

/** ثبت نهایی دستی (مثلاً وقتی داور نمره‌ی پیشنهادی AI را تأیید می‌کند) */
attemptsRouter.post('/:id/finalize', async (req, res) => {
  const db = await getDb();
  const attempt = await getAttempt(db, req.params.id);
  if (!attempt) throw notFound('تلاش موردنظر یافت نشد.');
  const exam = await getExamWithCourse(db, attempt.examId);
  if (!exam) throw notFound('آزمون یافت نشد.');

  const bundle = await finalizeAttempt(db, attempt.id, {
    gradedBy: req.user?.sub ?? null,
    note: 'ثبت نهایی دستی',
  });
  if (!bundle) throw notFound('تلاش موردنظر یافت نشد.');

  const pending = bundle.answers.filter((answer) => answer.needsManualGrading === 1);
  const status = pending.length === 0 ? 'GRADED' : 'SUBMITTED';
  const passed =
    pending.length === 0
      ? computePassed(bundle.attempt.score, bundle.attempt.maxScore, exam.passScore)
      : null;
  await updateAttempt(db, attempt.id, {
    status,
    passed: passed === null ? null : passed ? 1 : 0,
    gradedBy: req.user?.sub ?? null,
    gradedAt: Date.now(),
  });

  const updated = await loadAttemptBundle(db, attempt.id);
  res.json({ attempt: updated ? mapAttempt(updated.attempt as never) : null });
});

/** فهرست پاسخ‌های یک تلاش برای صفحه‌ی داوری */
attemptsRouter.get('/:id/answers', async (req, res) => {
  const db = await getDb();
  const answers = await listAnswers(db, req.params.id);
  res.json({ items: answers.map(mapAnswer) });
});

attemptsRouter.use((req, _res, next) => next(badRequest(`درخواست نامعتبر: ${req.path}`)));
