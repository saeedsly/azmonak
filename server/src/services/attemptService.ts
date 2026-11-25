import type { Kysely } from 'kysely';
import type { Database, AnswersTable, AttemptsTable, QuestionsTable } from '../db/types.js';
import {
  getAttemptWithExam,
  listAnswers,
  listQuestions,
  updateAnswer,
  updateAttempt,
  upsertAnswer,
} from '../db/repos.js';
import { gradeAnswer, computePassed, requiresManualGrading } from './grading.js';
import { newId, nowMs } from '../db/index.js';
import { stringifyJson } from '../db/mappers.js';

export interface AttemptBundle {
  attempt: AttemptsTable;
  exam: {
    id: string;
    title: string;
    type: string;
    status: string;
    showResultImmediately: number;
    showCorrectAnswers: number;
    showPerQuestionFeedback: number;
    passScore: number;
    durationMinutes: number;
    shuffleQuestions: number;
    shuffleOptions: number;
  };
  questions: QuestionsTable[];
  answers: AnswersTable[];
}

export async function loadAttemptBundle(
  db: Kysely<Database>,
  attemptId: string,
): Promise<AttemptBundle | null> {
  const attempt = await getAttemptWithExam(db, attemptId);
  if (!attempt) return null;
  const questions = await listQuestions(db, attempt.examId);
  const answers = await listAnswers(db, attemptId);
  return {
    attempt: attempt as unknown as AttemptsTable,
    exam: {
      id: attempt.examId,
      title: attempt.examTitle as unknown as string,
      type: attempt.examType as unknown as string,
      status: attempt.examStatus as unknown as string,
      showResultImmediately: attempt.examShowResultImmediately as unknown as number,
      showCorrectAnswers: attempt.examShowCorrectAnswers as unknown as number,
      showPerQuestionFeedback: attempt.examShowPerQuestionFeedback as unknown as number,
      passScore: attempt.examPassScore as unknown as number,
      durationMinutes: attempt.examDurationMinutes as unknown as number,
      shuffleQuestions: attempt.examShuffleQuestions as unknown as number,
      shuffleOptions: attempt.examShuffleOptions as unknown as number,
    },
    questions,
    answers,
  };
}

export interface FinalizeOptions {
  gradedBy?: string | null;
  note?: string;
  allowManualGrading?: boolean;
}

/** ثبت نهایی پاسخ‌ها، تصحیح خودکار و محاسبه نمره. */
export async function finalizeAttempt(
  db: Kysely<Database>,
  attemptId: string,
  options: FinalizeOptions = {},
): Promise<AttemptBundle | null> {
  const bundle = await loadAttemptBundle(db, attemptId);
  if (!bundle) return null;

  const { attempt, exam, questions, answers } = bundle;
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  let pendingManual = 0;
  let score = 0;
  let maxScore = 0;

  for (const question of questions) {
    maxScore += question.points;
    const existing = answerMap.get(question.id);
    const value = existing ? existing.value : '';
    const manual = requiresManualGrading(question);

    if (existing) {
      if (manual && existing.gradedBy && existing.pointsAwarded >= 0) {
        score += existing.pointsAwarded;
        continue;
      }
      if (manual) {
        pendingManual += 1;
        await updateAnswer(db, existing.id, {
          needsManualGrading: 1,
          isCorrect: null,
          pointsAwarded: 0,
          maxPoints: question.points,
        });
        continue;
      }
      const graded = gradeAnswer(question, JSON.parse(value || 'null'));
      score += graded.pointsAwarded;
      await updateAnswer(db, existing.id, {
        isCorrect: graded.isCorrect === null ? null : graded.isCorrect ? 1 : 0,
        pointsAwarded: graded.pointsAwarded,
        maxPoints: question.points,
        needsManualGrading: graded.needsManualGrading ? 1 : 0,
      });
      if (graded.needsManualGrading) pendingManual += 1;
      continue;
    }

    const graded = gradeAnswer(question, null);
    const row: AnswersTable = {
      id: newId(),
      attemptId: attempt.id,
      questionId: question.id,
      value: stringifyJson(null),
      isCorrect: graded.isCorrect === null ? null : graded.isCorrect ? 1 : 0,
      pointsAwarded: graded.pointsAwarded,
      maxPoints: question.points,
      needsManualGrading: graded.needsManualGrading ? 1 : 0,
      feedback: '',
      gradedBy: null,
      gradedAt: null,
      createdAt: nowMs(),
      updatedAt: nowMs(),
    };
    await upsertAnswer(db, row);
    score += graded.pointsAwarded;
    if (graded.needsManualGrading) pendingManual += 1;
  }

  const status = pendingManual > 0 ? 'SUBMITTED' : 'GRADED';
  const isSurvey = exam.type === 'SURVEY' || exam.type === 'POLL';
  const passed =
    pendingManual > 0 || isSurvey ? null : computePassed(score, maxScore, exam.passScore);

  await updateAttempt(db, attempt.id, {
    status,
    submittedAt: attempt.submittedAt ?? nowMs(),
    durationUsedSec: Math.max(
      0,
      Math.round((nowMs() - attempt.startedAt) / 1000),
    ),
    // در نظرسنجی‌ها نمره‌دهی معنا ندارد؛ نمره صفر ثبت می‌شود.
    score: isSurvey ? 0 : score,
    maxScore: isSurvey ? 0 : maxScore,
    passed: passed === null ? null : passed ? 1 : 0,
    gradedBy: options.gradedBy ?? attempt.gradedBy,
    gradedAt: options.gradedBy ? nowMs() : attempt.gradedAt,
    gradingNotes: options.note ?? attempt.gradingNotes,
  });

  return loadAttemptBundle(db, attemptId);
}

/** ذخیره خودکار پاسخ یک سوال. */
export async function saveAnswer(
  db: Kysely<Database>,
  attemptId: string,
  questionId: string,
  value: unknown,
): Promise<void> {
  await upsertAnswer(db, {
    id: newId(),
    attemptId,
    questionId,
    value: stringifyJson(value ?? null),
    isCorrect: null,
    pointsAwarded: 0,
    maxPoints: 0,
    needsManualGrading: 0,
    feedback: '',
    gradedBy: null,
    gradedAt: null,
    createdAt: nowMs(),
    updatedAt: nowMs(),
  });
}
