/**
 * انواع و ساختارهای دامنه‌ی «ازمونک» — مشترک بین سرور و رابط کاربری.
 */

export const QUESTION_TYPES = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'SHORT_TEXT',
  'LONG_TEXT',
  'FILE_UPLOAD',
  'RATING',
  'MATRIX',
  'NUMBER',
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const EXAM_TYPES = ['EXAM', 'SURVEY', 'POLL'] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_STATUSES = ['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED'] as const;
export type ExamStatus = (typeof EXAM_STATUSES)[number];

export const ATTEMPT_STATUSES = ['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED'] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const USER_ROLES = ['ADMIN', 'EDITOR', 'REVIEWER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const QUESTION_SOURCES = ['MANUAL', 'AI', 'IMPORT'] as const;
export type QuestionSource = (typeof QUESTION_SOURCES)[number];

/** همه‌ی امتیازها با ضریب ۱۰۰ ذخیره می‌شوند تا خطای اعشاری رخ ندهد. */
export const POINTS_SCALE = 100;

export interface OptionDto {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface MatrixRowDto {
  id: string;
  text: string;
}

export interface MatrixColumnDto {
  id: string;
  text: string;
}

export interface MatrixConfigDto {
  rows: MatrixRowDto[];
  columns: MatrixColumnDto[];
  correct: Record<string, string[]>;
}

export interface RatingConfigDto {
  min: number;
  max: number;
  step: number;
  minLabel: string;
  maxLabel: string;
  allowText: boolean;
}

export interface QuestionDto {
  id: string;
  examId: string;
  orderIndex: number;
  type: QuestionType;
  title: string;
  description: string;
  imageUrl: string;
  points: number;
  explanation: string;
  difficulty: number;
  tags: string[];
  isRequired: boolean;
  allowPartialCredit: boolean;
  options: OptionDto[];
  matrixConfig: MatrixConfigDto | null;
  ratingConfig: RatingConfigDto | null;
  source: QuestionSource;
  isApproved: boolean;
  aiMeta: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

/** سوالی که به فراگیر نمایش داده می‌شود (بدون پاسخ درست). */
export interface PublicQuestionDto {
  id: string;
  orderIndex: number;
  type: QuestionType;
  title: string;
  description: string;
  imageUrl: string;
  points: number;
  isRequired: boolean;
  options: Array<Omit<OptionDto, 'isCorrect'>>;
  matrixConfig: (Omit<MatrixConfigDto, 'correct'>) | null;
  ratingConfig: RatingConfigDto | null;
}

export interface CourseDto {
  id: string;
  title: string;
  description: string;
  code: string;
  instructor: string;
  color: string;
  isArchived: boolean;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  examCount?: number;
  questionCount?: number;
}

export interface ExamDto {
  id: string;
  courseId: string | null;
  courseTitle?: string | null;
  title: string;
  description: string;
  instructions: string;
  type: ExamType;
  status: ExamStatus;
  accessCode: string;
  durationMinutes: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultImmediately: boolean;
  showCorrectAnswers: boolean;
  showPerQuestionFeedback: boolean;
  passScore: number;
  startAt: number | null;
  endAt: number | null;
  requireName: boolean;
  requireEmail: boolean;
  requirePhone: boolean;
  requireNationalCode: boolean;
  allowAnonymous: boolean;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  questionCount?: number;
  totalPoints?: number;
  attemptCount?: number;
}

export interface ParticipantDto {
  name: string;
  email: string;
  phone: string;
  nationalCode: string;
  meta?: Record<string, unknown>;
}

export interface AttemptDto {
  id: string;
  examId: string;
  examTitle?: string;
  status: AttemptStatus;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  participantNationalCode: string;
  isAnonymous: boolean;
  startedAt: number;
  expiresAt: number | null;
  submittedAt: number | null;
  durationUsedSec: number | null;
  score: number;
  maxScore: number;
  passed: boolean | null;
  accessCodeUsed: string;
  gradingNotes: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnswerDto {
  id: string;
  attemptId: string;
  questionId: string;
  value: unknown;
  isCorrect: boolean | null;
  pointsAwarded: number;
  maxPoints: number;
  needsManualGrading: boolean;
  feedback: string;
  gradedBy: string | null;
  gradedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface InviteDto {
  id: string;
  examId: string;
  code: string;
  label: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number | null;
  isActive: boolean;
  createdAt: number;
}

export interface AiJobDto {
  id: string;
  kind: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  inputMeta: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error: string | null;
  createdBy: string | null;
  createdAt: number;
  finishedAt: number | null;
}

export interface SessionUserDto {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: UserRole;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
