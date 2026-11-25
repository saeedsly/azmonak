import { Router } from 'express';
import { aiGenerateSchema, aiImportSchema } from '@azmoonak/shared';
import { getDb } from '../../db/index.js';
import {
  createAiJob,
  getAttemptWithExam,
  listAnswers,
  listAiJobs,
  listQuestions,
  updateAiJob,
} from '../../db/repos.js';
import { mapQuestion, parseJson, stringifyJson } from '../../db/mappers.js';
import { badRequest, notFound } from '../../lib/errors.js';
import { parseSafe } from '../../middleware/error.js';
import { uploadFiles } from '../../middleware/upload.js';
import { aiStatus, AIError } from '../../services/ai.js';
import {
  extractQuestions,
  generateQuestions,
  suggestGrades,
  summarizeSurvey,
} from '../../services/aiTasks.js';
import { buildQuestionRow } from '../../services/questionService.js';
import { insertQuestion, nextOrderIndex } from '../../db/repos.js';
import { saveBuffer } from '../../services/storage.js';
import { uploadSingle } from '../../middleware/upload.js';

export const aiRouter = Router();

aiRouter.get('/status', async (_req, res) => {
  res.json(aiStatus());
});

aiRouter.get('/jobs', async (_req, res) => {
  const db = await getDb();
  const rows = await listAiJobs(db, 50);
  res.json({
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      status: row.status,
      inputMeta: parseJson<Record<string, unknown>>(row.inputMeta, {}),
      result: parseJson<Record<string, unknown>>(row.result, {}),
      error: row.error,
      createdAt: row.createdAt,
      finishedAt: row.finishedAt,
    })),
  });
});

/** استخراج سوال از عکس/PDF — پیشنهاد می‌دهد، ساخت نهایی با تایید مدیر است. */
aiRouter.post('/extract', uploadFiles, async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const meta = parseSafe(aiImportSchema.partial(), req.body ?? {});
  const db = await getDb();

  const job = await createAiJob(db, {
    kind: 'EXTRACT_QUESTIONS',
    inputMeta: {
      fileName: meta.fileName ?? files[0]?.originalname ?? '',
      files: files.map((file) => file.originalname),
      instructions: meta.instructions ?? '',
    },
    createdBy: req.user?.sub ?? null,
  });

  try {
    if (files.length === 0 && !meta.instructions) {
      throw badRequest('حداقل یک فایل یا متن برگه را ارسال کنید.');
    }
    const extraction = await extractQuestions({
      files: files.map((file) => ({
        buffer: file.buffer,
        mimeType: file.mimetype,
        fileName: file.originalname,
      })),
      text: typeof req.body?.text === 'string' ? req.body.text : undefined,
      instructions: meta.instructions,
    });

    await updateAiJob(db, job.id, {
      status: 'SUCCEEDED',
      result: stringifyJson({ count: extraction.questions.length, demo: extraction.demo }),
      finishedAt: Date.now(),
    });

    res.json(extraction);
  } catch (error) {
    await updateAiJob(db, job.id, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'خطای نامشخص',
      finishedAt: Date.now(),
    });
    if (error instanceof AIError) throw badRequest(error.message);
    throw error;
  }
});

/** استخراج و ذخیره‌ی مستقیم در آزمون (به صورت سوال پیش‌نویس). */
aiRouter.post('/extract/save', uploadFiles, async (req, res) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const meta = parseSafe(aiImportSchema, req.body ?? {});
  if (!meta.examId) throw badRequest('آزمون مقصد انتخاب نشده است.');
  const db = await getDb();

  const extraction = await extractQuestions({
    files: files.map((file) => ({
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
    })),
    text: typeof req.body?.text === 'string' ? req.body.text : undefined,
    instructions: meta.instructions,
  });

  let order = await nextOrderIndex(db, meta.examId);
  const created = [];
  for (const question of extraction.questions) {
    const row = buildQuestionRow(
      meta.examId,
      {
        type: question.type as never,
        title: question.title,
        description: question.description,
        options: question.options.map((option, index) => ({
          id: '',
          text: option.text,
          isCorrect: option.isCorrect,
          order: index,
        })),
        points: question.points,
        difficulty: question.difficulty,
        explanation: question.explanation,
        tags: question.tags,
        isRequired: true,
        allowPartialCredit: false,
      },
      order,
      'AI',
      { confidence: question.confidence, warnings: question.warnings, notes: extraction.notes },
    );
    await insertQuestion(db, row);
    created.push(mapQuestion(row));
    order += 1;
  }

  res.status(201).json({ items: created, notes: extraction.notes, demo: extraction.demo });
});

/** تولید سوال با هوش مصنوعی */
aiRouter.post('/generate', async (req, res) => {
  const input = parseSafe(aiGenerateSchema, req.body);
  const db = await getDb();
  const job = await createAiJob(db, {
    kind: 'GENERATE_QUESTIONS',
    inputMeta: { topic: input.topic, count: input.questionCount },
    createdBy: req.user?.sub ?? null,
  });

  try {
    const result = await generateQuestions({
      topic: input.topic,
      courseTitle: input.courseTitle,
      questionCount: input.questionCount,
      types: input.types,
      difficulty: input.difficulty,
      language: input.language,
    });
    await updateAiJob(db, job.id, {
      status: 'SUCCEEDED',
      result: stringifyJson({ count: result.questions.length }),
      finishedAt: Date.now(),
    });
    res.json(result);
  } catch (error) {
    await updateAiJob(db, job.id, {
      status: 'FAILED',
      error: error instanceof Error ? error.message : 'خطای نامشخص',
      finishedAt: Date.now(),
    });
    if (error instanceof AIError) throw badRequest(error.message);
    throw error;
  }
});

/** پیشنهاد نمره برای پاسخ‌های تشریحی */
aiRouter.post('/grade', async (req, res) => {
  const attemptId = String(req.body?.attemptId ?? '');
  if (!attemptId) throw badRequest('شناسه تلاش ارسال نشده است.');
  const db = await getDb();

  const attempt = await getAttemptWithExam(db, attemptId);
  if (!attempt) throw notFound('تلاش موردنظر یافت نشد.');
  const questions = await listQuestions(db, attempt.examId);
  const answers = await listAnswers(db, attemptId);

  const items = questions
    .filter((question) => ['SHORT_TEXT', 'LONG_TEXT', 'FILE_UPLOAD'].includes(question.type))
    .map((question) => {
      const answer = answers.find((item) => item.questionId === question.id);
      const value = answer ? parseJson<unknown>(answer.value, null) : null;
      const text =
        typeof value === 'string'
          ? value
          : value && typeof value === 'object'
            ? JSON.stringify(value)
            : '';
      return { question: question.title, answer: text || '(پاسخی داده نشده)', maxPoints: question.points / 100 };
    });

  if (items.length === 0) throw badRequest('پاسخ تشریحی برای تصحیح وجود ندارد.');

  const result = await suggestGrades({ examTitle: attempt.examTitle as unknown as string, items });

  const suggestions = result.suggestions
    .map((suggestion) => {
      const question = questions.filter((item) =>
        ['SHORT_TEXT', 'LONG_TEXT', 'FILE_UPLOAD'].includes(item.type),
      )[suggestion.index];
      const answer = question
        ? answers.find((item) => item.questionId === question.id)
        : undefined;
      if (!question || !answer) return null;
      return {
        answerId: answer.id,
        questionId: question.id,
        questionTitle: question.title,
        maxPoints: question.points / 100,
        pointsAwarded: suggestion.pointsAwarded,
        feedback: suggestion.feedback,
        reasoning: suggestion.reasoning,
        answerValue: parseJson<unknown>(answer.value, null),
      };
    })
    .filter(Boolean);

  res.json({ suggestions, summary: result.summary, demo: result.demo });
});

/** خلاصه‌سازی نتایج نظرسنجی */
aiRouter.post('/summarize', async (req, res) => {
  const examId = String(req.body?.examId ?? '');
  if (!examId) throw badRequest('شناسه آزمون ارسال نشده است.');
  const db = await getDb();
  const questions = await listQuestions(db, examId);
  if (questions.length === 0) throw badRequest('برای این آزمون سوالی ثبت نشده است.');

  const stats: Record<string, unknown> = {};
  for (const question of questions) {
    stats[question.title] = { type: question.type, points: question.points / 100 };
  }

  const result = await summarizeSurvey({ examTitle: questions[0].examId, stats });
  res.json(result);
});

/** بارگذاری فایل (تصویر سوال، فایل پیوست و ...) */
export const uploadsRouter = Router();

uploadsRouter.post('/', uploadSingle, async (req, res) => {
  const file = req.file;
  if (!file) throw badRequest('فایلی ارسال نشده است.');
  const stored = await saveBuffer(file.buffer, file.mimetype, file.originalname);
  res.status(201).json(stored);
});
