import { Router } from 'express';
import {
  bulkQuestionSchema,
  examInputSchema,
  examUpdateSchema,
  inviteInputSchema,
  listQuerySchema,
  questionUpdateSchema,
  reorderQuestionsSchema,
} from '@azmoonak/shared';
import { getDb, newId, nowMs } from '../../db/index.js';
import {
  createExam,
  createInvite,
  deactivateInvite,
  deleteExam,
  deleteQuestion,
  examAggregates,
  findExamByAccessCode,
  findInviteByCode,
  getExamWithCourse,
  insertQuestion,
  listExams,
  listInvites,
  listQuestions,
  nextOrderIndex,
  reorderQuestions,
  updateExam,
  updateQuestion,
} from '../../db/repos.js';
import { mapExam, mapInvite, mapQuestion } from '../../db/mappers.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { generateAccessCode, generateInviteCode } from '../../lib/codes.js';
import { parseSafe } from '../../middleware/error.js';
import { buildQuestionRow, questionInputToPatch } from '../../services/questionService.js';

export const examsRouter = Router();

async function uniqueAccessCode(): Promise<string> {
  const db = await getDb();
  for (let i = 0; i < 20; i += 1) {
    const code = generateAccessCode();
    const existing = await findExamByAccessCode(db, code);
    if (!existing) return code;
  }
  throw badRequest('تولید کد دسترسی ممکن نشد؛ دوباره تلاش کنید.');
}

/* --------------------------------- فهرست آزمون‌ها ------------------------------ */

examsRouter.get('/', async (req, res) => {
  const query = parseSafe(listQuerySchema, req.query);
  const db = await getDb();
  const { rows, total } = await listExams(db, {
    search: query.search,
    courseId: query.courseId,
    status: query.status,
    type: query.type,
    page: query.page,
    pageSize: query.pageSize,
  });
  res.json({
    items: rows.map((row) => ({
      ...mapExam(row as never),
      courseTitle: (row as never as { courseTitle?: string }).courseTitle ?? null,
      questionCount: Number((row as never as { questionCount?: number }).questionCount ?? 0),
      attemptCount: Number((row as never as { attemptCount?: number }).attemptCount ?? 0),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  });
});

/* ---------------------------------- ساخت آزمون -------------------------------- */

examsRouter.post('/', async (req, res) => {
  const input = parseSafe(examInputSchema, req.body);
  const db = await getDb();
  const row = await createExam(db, {
    ...input,
    accessCode: await uniqueAccessCode(),
    createdBy: req.user?.sub ?? null,
    shuffleQuestions: input.shuffleQuestions ? 1 : 0,
    shuffleOptions: input.shuffleOptions ? 1 : 0,
    showResultImmediately: input.showResultImmediately ? 1 : 0,
    showCorrectAnswers: input.showCorrectAnswers ? 1 : 0,
    showPerQuestionFeedback: input.showPerQuestionFeedback ? 1 : 0,
    requireName: input.requireName ? 1 : 0,
    requireEmail: input.requireEmail ? 1 : 0,
    requirePhone: input.requirePhone ? 1 : 0,
    requireNationalCode: input.requireNationalCode ? 1 : 0,
    allowAnonymous: input.allowAnonymous ? 1 : 0,
  });
  res.status(201).json(mapExam(row));
});

/* ---------------------------------- جزئیات آزمون ------------------------------- */

examsRouter.get('/:id', async (req, res) => {
  const db = await getDb();
  const row = await getExamWithCourse(db, req.params.id);
  if (!row) throw notFound('آزمون یافت نشد.');
  const aggregates = await examAggregates(db, row.id);
  res.json({
    ...mapExam(row as never),
    courseTitle: (row as never as { courseTitle?: string }).courseTitle ?? null,
    questionCount: aggregates.questionCount,
    totalPoints: Math.round(aggregates.totalPoints / 100),
    attemptCount: aggregates.attemptCount,
    averageScore: Math.round(aggregates.averageScore / 100),
  });
});

examsRouter.patch('/:id', async (req, res) => {
  const input = parseSafe(examUpdateSchema, req.body);
  const db = await getDb();
  const row = await getExamWithCourse(db, req.params.id);
  if (!row) throw notFound('آزمون یافت نشد.');

  const patch: Record<string, unknown> = {};
  const map: Record<string, keyof typeof row> = {
    title: 'title',
    description: 'description',
    instructions: 'instructions',
    type: 'type',
    status: 'status',
    durationMinutes: 'durationMinutes',
    maxAttempts: 'maxAttempts',
    passScore: 'passScore',
    startAt: 'startAt',
    endAt: 'endAt',
    courseId: 'courseId',
  };
  for (const [key, column] of Object.entries(map)) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) patch[column] = value;
  }
  const booleans = [
    'shuffleQuestions',
    'shuffleOptions',
    'showResultImmediately',
    'showCorrectAnswers',
    'showPerQuestionFeedback',
    'requireName',
    'requireEmail',
    'requirePhone',
    'requireNationalCode',
    'allowAnonymous',
  ] as const;
  for (const key of booleans) {
    const value = (input as Record<string, unknown>)[key];
    if (value !== undefined) patch[key] = value ? 1 : 0;
  }

  await updateExam(db, row.id, patch as never);
  const updated = await getExamWithCourse(db, row.id);
  res.json(mapExam(updated as never));
});

examsRouter.delete('/:id', async (req, res) => {
  const db = await getDb();
  const row = await getExamWithCourse(db, req.params.id);
  if (!row) throw notFound('آزمون یافت نشد.');
  await deleteExam(db, row.id);
  res.json({ ok: true });
});

examsRouter.post('/:id/duplicate', async (req, res) => {
  const db = await getDb();
  const row = await getExamWithCourse(db, req.params.id);
  if (!row) throw notFound('آزمون یافت نشد.');
  const copy = await createExam(db, {
    courseId: row.courseId,
    title: `${row.title} (کپی)`,
    description: row.description,
    instructions: row.instructions,
    type: row.type,
    status: 'DRAFT',
    accessCode: await uniqueAccessCode(),
    durationMinutes: row.durationMinutes,
    maxAttempts: row.maxAttempts,
    shuffleQuestions: row.shuffleQuestions,
    shuffleOptions: row.shuffleOptions,
    showResultImmediately: row.showResultImmediately,
    showCorrectAnswers: row.showCorrectAnswers,
    showPerQuestionFeedback: row.showPerQuestionFeedback,
    passScore: row.passScore,
    startAt: row.startAt,
    endAt: row.endAt,
    requireName: row.requireName,
    requireEmail: row.requireEmail,
    requirePhone: row.requirePhone,
    requireNationalCode: row.requireNationalCode,
    allowAnonymous: row.allowAnonymous,
    createdBy: req.user?.sub ?? null,
  });

  const questions = await listQuestions(db, row.id);
  for (const question of questions) {
    await insertQuestion(db, {
      ...question,
      id: newId(),
      examId: copy.id,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    });
  }

  res.status(201).json(mapExam(copy));
});

examsRouter.post('/:id/regenerate-code', async (req, res) => {
  const db = await getDb();
  const row = await getExamWithCourse(db, req.params.id);
  if (!row) throw notFound('آزمون یافت نشد.');
  const code = await uniqueAccessCode();
  await updateExam(db, row.id, { accessCode: code });
  res.json({ accessCode: code });
});

/* ----------------------------------- سوال‌ها ---------------------------------- */

examsRouter.get('/:id/questions', async (req, res) => {
  const db = await getDb();
  const rows = await listQuestions(db, req.params.id);
  res.json({ items: rows.map(mapQuestion) });
});

examsRouter.post('/:id/questions', async (req, res) => {
  const input = parseSafe(bulkQuestionSchema, req.body);
  const db = await getDb();
  const exam = await getExamWithCourse(db, req.params.id);
  if (!exam) throw notFound('آزمون یافت نشد.');

  let order = await nextOrderIndex(db, exam.id);
  const created = [];
  for (const question of input.questions) {
    const row = buildQuestionRow(exam.id, question, order);
    await insertQuestion(db, row);
    created.push(mapQuestion(row));
    order += 1;
  }
  res.status(201).json({ items: created });
});

examsRouter.post('/:id/questions/reorder', async (req, res) => {
  const input = parseSafe(reorderQuestionsSchema, req.body);
  const db = await getDb();
  await reorderQuestions(db, req.params.id, input.order);
  const rows = await listQuestions(db, req.params.id);
  res.json({ items: rows.map(mapQuestion) });
});

/* ---------------------------------- کدهای دسترسی ------------------------------- */

examsRouter.get('/:id/invites', async (req, res) => {
  const db = await getDb();
  const rows = await listInvites(db, req.params.id);
  res.json({ items: rows.map(mapInvite) });
});

examsRouter.post('/:id/invites', async (req, res) => {
  const input = parseSafe(inviteInputSchema, req.body);
  const db = await getDb();
  const exam = await getExamWithCourse(db, req.params.id);
  if (!exam) throw notFound('آزمون یافت نشد.');

  const created = [];
  for (let i = 0; i < input.count; i += 1) {
    let code = generateInviteCode();
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const existing = await findInviteByCode(db, code);
      if (!existing) break;
      code = generateInviteCode();
    }
    const row = await createInvite(db, {
      id: newId(),
      examId: exam.id,
      code,
      label: input.label || `کد ${i + 1}`,
      maxUses: input.maxUses,
      usedCount: 0,
      expiresAt: input.expiresAt ?? null,
      isActive: 1,
      createdAt: nowMs(),
    });
    created.push(mapInvite(row));
  }
  res.status(201).json({ items: created });
});

export const invitesRouter = Router();

invitesRouter.delete('/:id', async (req, res) => {
  const db = await getDb();
  await deactivateInvite(db, req.params.id);
  res.json({ ok: true });
});

/* ------------------------------- سوال (تکی) ---------------------------------- */

export const questionsRouter = Router();

questionsRouter.patch('/:id', async (req, res) => {
  const input = parseSafe(questionUpdateSchema, req.body);
  const db = await getDb();
  const patch = questionInputToPatch(input);
  await updateQuestion(db, req.params.id, patch);
  const question = await db
    .selectFrom('questions')
    .selectAll()
    .where('id', '=', req.params.id)
    .executeTakeFirst();
  if (!question) throw notFound('سوال یافت نشد.');
  res.json(mapQuestion(question));
});

questionsRouter.delete('/:id', async (req, res) => {
  const db = await getDb();
  await deleteQuestion(db, req.params.id);
  res.json({ ok: true });
});
