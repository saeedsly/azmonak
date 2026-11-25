import type {
  AnswerDto,
  AttemptDto,
  CourseDto,
  ExamDto,
  InviteDto,
  MatrixConfigDto,
  OptionDto,
  QuestionDto,
  RatingConfigDto,
  SessionUserDto,
} from '@azmoonak/shared';
import { POINTS_SCALE } from '@azmoonak/shared';
import type {
  AnswersTable,
  AttemptsTable,
  CoursesTable,
  ExamsTable,
  InvitesTable,
  QuestionsTable,
  UsersTable,
} from './types.js';

export function bool(value: number | null | undefined): boolean {
  return value === 1;
}

export function num(value: number | null | undefined): boolean | null {
  if (value === null || value === undefined) return null;
  return value === 1;
}

export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function toHundredths(points: number): number {
  return Math.round(points * POINTS_SCALE);
}

export function fromHundredths(points: number): number {
  return Math.round(points / POINTS_SCALE);
}

export function mapUser(row: UsersTable): SessionUserDto {
  return {
    id: row.id,
    username: row.username,
    fullName: row.fullName,
    email: row.email,
    role: row.role as SessionUserDto['role'],
  };
}

export function mapCourse(row: CoursesTable): CourseDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    code: row.code,
    instructor: row.instructor,
    color: row.color,
    isArchived: bool(row.isArchived),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapExam(row: ExamsTable): ExamDto {
  return {
    id: row.id,
    courseId: row.courseId,
    title: row.title,
    description: row.description,
    instructions: row.instructions,
    type: row.type as ExamDto['type'],
    status: row.status as ExamDto['status'],
    accessCode: row.accessCode,
    durationMinutes: row.durationMinutes,
    maxAttempts: row.maxAttempts,
    shuffleQuestions: bool(row.shuffleQuestions),
    shuffleOptions: bool(row.shuffleOptions),
    showResultImmediately: bool(row.showResultImmediately),
    showCorrectAnswers: bool(row.showCorrectAnswers),
    showPerQuestionFeedback: bool(row.showPerQuestionFeedback),
    passScore: row.passScore,
    startAt: row.startAt,
    endAt: row.endAt,
    requireName: bool(row.requireName),
    requireEmail: bool(row.requireEmail),
    requirePhone: bool(row.requirePhone),
    requireNationalCode: bool(row.requireNationalCode),
    allowAnonymous: bool(row.allowAnonymous),
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapQuestion(row: QuestionsTable): QuestionDto {
  return {
    id: row.id,
    examId: row.examId,
    orderIndex: row.orderIndex,
    type: row.type as QuestionDto['type'],
    title: row.title,
    description: row.description ?? '',
    imageUrl: row.imageUrl ?? '',
    points: fromHundredths(row.points),
    explanation: row.explanation ?? '',
    difficulty: row.difficulty,
    tags: parseJson<string[]>(row.tags, []),
    isRequired: bool(row.isRequired),
    allowPartialCredit: bool(row.allowPartialCredit),
    options: parseJson<OptionDto[]>(row.options, []),
    matrixConfig: parseJson<MatrixConfigDto | null>(row.matrixConfig, null),
    ratingConfig: parseJson<RatingConfigDto | null>(row.ratingConfig, null),
    source: row.source as QuestionDto['source'],
    isApproved: bool(row.isApproved),
    aiMeta: parseJson<Record<string, unknown> | null>(row.aiMeta, null),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapAttempt(row: AttemptsTable): AttemptDto {
  return {
    id: row.id,
    examId: row.examId,
    status: row.status as AttemptDto['status'],
    participantName: row.participantName,
    participantEmail: row.participantEmail,
    participantPhone: row.participantPhone,
    participantNationalCode: row.participantNationalCode,
    isAnonymous: bool(row.isAnonymous),
    startedAt: row.startedAt,
    expiresAt: row.expiresAt,
    submittedAt: row.submittedAt,
    durationUsedSec: row.durationUsedSec,
    score: fromHundredths(row.score),
    maxScore: fromHundredths(row.maxScore),
    passed: num(row.passed),
    accessCodeUsed: row.accessCodeUsed,
    gradingNotes: row.gradingNotes ?? '',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapAnswer(row: AnswersTable): AnswerDto {
  return {
    id: row.id,
    attemptId: row.attemptId,
    questionId: row.questionId,
    value: parseJson<unknown>(row.value, null),
    isCorrect: num(row.isCorrect),
    pointsAwarded: fromHundredths(row.pointsAwarded),
    maxPoints: fromHundredths(row.maxPoints),
    needsManualGrading: bool(row.needsManualGrading),
    feedback: row.feedback ?? '',
    gradedBy: row.gradedBy,
    gradedAt: row.gradedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapInvite(row: InvitesTable): InviteDto {
  return {
    id: row.id,
    examId: row.examId,
    code: row.code,
    label: row.label,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    expiresAt: row.expiresAt,
    isActive: bool(row.isActive),
    createdAt: row.createdAt,
  };
}
