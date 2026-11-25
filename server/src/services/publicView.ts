import type { AnswersTable, QuestionsTable } from '../db/types.js';
import type { PublicQuestionDto } from '@azmoonak/shared';
import { mapQuestion } from '../db/mappers.js';
import { parseJson } from '../db/mappers.js';
import type { AttemptBundle } from './attemptService.js';

export function toPublicQuestion(question: QuestionsTable): PublicQuestionDto {
  const full = mapQuestion(question);
  return {
    id: full.id,
    orderIndex: full.orderIndex,
    type: full.type,
    title: full.title,
    description: full.description,
    imageUrl: full.imageUrl,
    points: full.points,
    isRequired: full.isRequired,
    options: full.options.map((option) => ({
      id: option.id,
      text: option.text,
      order: option.order,
    })),
    matrixConfig: full.matrixConfig
      ? {
          rows: full.matrixConfig.rows,
          columns: full.matrixConfig.columns,
        }
      : null,
    ratingConfig: full.ratingConfig,
  };
}

function answerValue(answer: AnswersTable | undefined): unknown {
  if (!answer) return null;
  return parseJson<unknown>(answer.value, null);
}

export interface ResultQuestion {
  id: string;
  orderIndex: number;
  type: string;
  title: string;
  points: number;
  yourAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean | null;
  pointsAwarded: number;
  maxPoints: number;
  explanation: string;
  feedback: string;
}

export interface ResultPayload {
  attemptId: string;
  examId: string;
  examTitle: string;
  type: string;
  status: string;
  submittedAt: number | null;
  durationUsedSec: number | null;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean | null;
  showDetails: boolean;
  pendingManualGrading: boolean;
  questions: ResultQuestion[];
}

export function buildResult(
  bundle: AttemptBundle,
  options: { includeDetails: boolean },
): ResultPayload {
  const { attempt, exam, questions, answers } = bundle;
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer]));
  const isSurvey = exam.type === 'SURVEY' || exam.type === 'POLL';
  const showDetails =
    options.includeDetails &&
    !isSurvey &&
    exam.showResultImmediately === 1 &&
    attempt.status !== 'IN_PROGRESS';

  const resultQuestions: ResultQuestion[] = questions.map((question) => {
    const full = mapQuestion(question);
    const answer = answerMap.get(question.id);
    const correctAnswer = full.options.filter((option) => option.isCorrect).map((option) => option.id);
    return {
      id: full.id,
      orderIndex: full.orderIndex,
      type: full.type,
      title: full.title,
      points: full.points,
      yourAnswer: answerValue(answer),
      correctAnswer: showDetails && exam.showCorrectAnswers === 1 ? correctAnswer : [],
      isCorrect: showDetails && answer ? answer.isCorrect === 1 : null,
      pointsAwarded: showDetails && answer ? answer.pointsAwarded / 100 : 0,
      maxPoints: full.points,
      explanation:
        showDetails && (exam.showPerQuestionFeedback === 1 || exam.showCorrectAnswers === 1)
          ? full.explanation
          : '',
      feedback: answer?.feedback ?? '',
    };
  });

  const maxScore = attempt.maxScore / 100;
  const score = attempt.score / 100;

  return {
    attemptId: attempt.id,
    examId: exam.id,
    examTitle: exam.title,
    type: exam.type,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    durationUsedSec: attempt.durationUsedSec,
    score,
    maxScore,
    percent: maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0,
    passed: attempt.passed === null ? null : attempt.passed === 1,
    showDetails,
    pendingManualGrading: attempt.status === 'SUBMITTED',
    questions: resultQuestions,
  };
}
