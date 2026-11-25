import { Router } from 'express';
import { getDb } from '../../db/index.js';
import { listAnswers, listAttempts, listQuestions } from '../../db/repos.js';
import { mapQuestion, parseJson } from '../../db/mappers.js';
import { notFound } from '../../lib/errors.js';
import { toCsv } from '../../services/csv.js';
import { formatJalaliDate } from '@azmoonak/shared';

export const resultsRouter = Router();

const BUCKETS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

resultsRouter.get('/exams/:id/analytics', async (req, res) => {
  const db = await getDb();
  const questions = await listQuestions(db, req.params.id);
  const { rows } = await listAttempts(db, { examId: req.params.id, pageSize: 2000 });
  const attempts = rows as unknown as Array<{ id: string; score: number; maxScore: number; status: string; participantName: string; submittedAt: number | null }>;
  const attemptIds = attempts.map((attempt) => attempt.id);
  const answers = attemptIds.length
    ? await db
        .selectFrom('answers')
        .selectAll()
        .where('attemptId', 'in', attemptIds)
        .execute()
    : [];

  const answeredAttempts = attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');

  const questionStats = questions.map((question) => {
    const full = mapQuestion(question);
    const questionAnswers = answers.filter((answer) => answer.questionId === question.id);
    const autoGraded = questionAnswers.filter((answer) => answer.isCorrect !== null);
    const correct = autoGraded.filter((answer) => answer.isCorrect === 1).length;
    const answered = questionAnswers.filter((answer) => {
      const value = parseJson<unknown>(answer.value, null);
      if (value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }).length;

    const distribution: Array<{ optionId: string; text: string; count: number; isCorrect: boolean }> =
      full.options.map((option) => ({ optionId: option.id, text: option.text, count: 0, isCorrect: option.isCorrect }));

    for (const answer of questionAnswers) {
      const value = parseJson<unknown>(answer.value, null);
      const selected = Array.isArray(value) ? value.map(String) : value ? [String(value)] : [];
      for (const id of selected) {
        const bucket = distribution.find((item) => item.optionId === id);
        if (bucket) bucket.count += 1;
      }
    }

    const awarded = questionAnswers.reduce((sum, answer) => sum + answer.pointsAwarded, 0);

    return {
      questionId: question.id,
      orderIndex: question.orderIndex,
      type: question.type,
      title: question.title,
      points: full.points,
      answersCount: answered,
      gradedCount: autoGraded.length,
      correctCount: correct,
      correctRate: autoGraded.length ? Math.round((correct / autoGraded.length) * 1000) / 10 : null,
      averagePoints: answered ? Math.round((awarded / 100 / answered) * 100) / 100 : 0,
      distribution: full.type === 'RATING' || full.type === 'MATRIX' ? [] : distribution,
    };
  });

  const distribution = BUCKETS.map((start, index) => {
    const end = BUCKETS[index + 1] ?? 100;
    const count = answeredAttempts.filter((attempt) => {
      const percent = attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0;
      if (index === BUCKETS.length - 1) return percent >= start;
      return percent >= start && percent < end;
    }).length;
    return { range: `${start}-${end === 100 ? 100 : end - 1}`, count };
  });

  res.json({
    totals: {
      questions: questions.length,
      attempts: answeredAttempts.length,
      averagePercent: answeredAttempts.length
        ? Math.round(
            (answeredAttempts.reduce(
              (sum, attempt) => sum + (attempt.maxScore > 0 ? (attempt.score / attempt.maxScore) * 100 : 0),
              0,
            ) /
              answeredAttempts.length) *
              10,
          ) / 10
        : 0,
      pendingManual: answeredAttempts.filter((attempt) => attempt.status === 'SUBMITTED').length,
    },
    distribution,
    questions: questionStats,
  });
});

resultsRouter.get('/exams/:id/survey-results', async (req, res) => {
  const db = await getDb();
  const questions = await listQuestions(db, req.params.id);
  const { rows } = await listAttempts(db, { examId: req.params.id, pageSize: 2000 });
  const attemptIds = (rows as unknown as Array<{ id: string }>).map((attempt) => attempt.id);
  const answers = attemptIds.length
    ? await db
        .selectFrom('answers')
        .selectAll()
        .where('attemptId', 'in', attemptIds)
        .execute()
    : [];

  const results = questions.map((question) => {
    const full = mapQuestion(question);
    const questionAnswers = answers.filter((answer) => answer.questionId === question.id);
    const values = questionAnswers
      .map((answer) => parseJson<unknown>(answer.value, null))
      .filter((value) => value !== null && value !== '');

    const counts = new Map<string, number>();
    for (const value of values) {
      const list = Array.isArray(value) ? value.map(String) : [String(value)];
      for (const item of list) counts.set(item, (counts.get(item) ?? 0) + 1);
    }

    const ratingValues = values
      .map((value) => Number(Array.isArray(value) ? value[0] : value))
      .filter((value) => Number.isFinite(value));

    const texts = values
      .map((value) => (typeof value === 'string' ? value : ''))
      .filter((text) => text.trim().length > 0);

    return {
      questionId: question.id,
      type: question.type,
      title: full.title,
      responseCount: values.length,
      average:
        ratingValues.length > 0
          ? Math.round((ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length) * 100) / 100
          : null,
      breakdown: full.options.map((option) => ({
        optionId: option.id,
        text: option.text,
        count: counts.get(option.id) ?? 0,
        percent: values.length ? Math.round(((counts.get(option.id) ?? 0) / values.length) * 1000) / 10 : 0,
      })),
      comments: texts.slice(0, 50),
    };
  });

  res.json({ results });
});

resultsRouter.get('/exams/:id/export.csv', async (req, res) => {
  const db = await getDb();
  const questions = await listQuestions(db, req.params.id);
  if (questions.length === 0) throw notFound('برای این آزمون سوالی ثبت نشده است.');

  const { rows } = await listAttempts(db, { examId: req.params.id, pageSize: 5000 });
  const attempts = rows as unknown as Array<{ id: string }>;
  const attemptIds = attempts.map((attempt) => attempt.id);
  const answers = attemptIds.length
    ? await db
        .selectFrom('answers')
        .selectAll()
        .where('attemptId', 'in', attemptIds)
        .execute()
    : [];

  const headers = [
    'نام فراگیر',
    'ایمیل',
    'شماره تماس',
    'کد ملی',
    'وضعیت',
    'نمره',
    'حداکثر نمره',
    'درصد',
    'قبولی',
    'زمان شروع',
    'زمان ارسال',
    'مدت (ثانیه)',
    ...questions.map((question, index) => `سوال ${index + 1}`),
  ];

  const body = (rows as unknown as Array<Record<string, unknown>>).map((row) => {
    const attemptId = String(row.id);
    const attemptAnswers = answers.filter((answer) => answer.attemptId === attemptId);
    const score = Number(row.score ?? 0) / 100;
    const maxScore = Number(row.maxScore ?? 0) / 100;
    return [
      String(row.participantName ?? ''),
      String(row.participantEmail ?? ''),
      String(row.participantPhone ?? ''),
      String(row.participantNationalCode ?? ''),
      String(row.status ?? ''),
      score,
      maxScore,
      maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0,
      row.passed === null ? '' : row.passed === 1 ? 'قبول' : 'مردود',
      formatJalaliDate(Number(row.startedAt ?? 0)),
      formatJalaliDate(row.submittedAt ? Number(row.submittedAt) : null),
      String(row.durationUsedSec ?? ''),
      ...questions.map((question) => {
        const answer = attemptAnswers.find((item) => item.questionId === question.id);
        if (!answer) return '';
        const value = parseJson<unknown>(answer.value, null);
        if (value === null) return '';
        if (Array.isArray(value)) return value.map(String).join(' | ');
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      }),
    ];
  });

  const csv = toCsv(headers, body);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="azmoonak-${req.params.id.slice(0, 8)}.csv"`,
  );
  res.send(csv);
});
