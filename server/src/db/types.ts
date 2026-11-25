/**
 * تعریف جداول دیتابیس برای Kysely.
 *
 * نکته‌های معماری:
 *  - همه‌ی زمان‌ها به صورت epoch milliseconds (bigint) ذخیره می‌شوند تا رفتار
 *    بین MySQL و SQLite کاملاً یکسان باشد و مشکل timezone پیش نیاید.
 *  - مقادیر boolean به صورت integer (0/1) ذخیره می‌شوند.
 *  - فیلدهای JSON به صورت text ذخیره شده و در لایه‌ی repository تبدیل می‌شوند.
 *  - ستون‌های ایندکس‌شده varchar(191) هستند تا با utf8mb4 روی MySQL مشکل
 *    طول کلید ایندکس ایجاد نشود.
 */

export interface UsersTable {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string;
  fullName: string;
  role: string;
  isActive: number;
  lastLoginAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CoursesTable {
  id: string;
  title: string;
  description: string;
  code: string;
  instructor: string;
  color: string;
  isArchived: number;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ExamsTable {
  id: string;
  courseId: string | null;
  title: string;
  description: string;
  instructions: string;
  type: string;
  status: string;
  accessCode: string;
  durationMinutes: number;
  maxAttempts: number;
  shuffleQuestions: number;
  shuffleOptions: number;
  showResultImmediately: number;
  showCorrectAnswers: number;
  showPerQuestionFeedback: number;
  passScore: number;
  startAt: number | null;
  endAt: number | null;
  requireName: number;
  requireEmail: number;
  requirePhone: number;
  requireNationalCode: number;
  allowAnonymous: number;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface QuestionsTable {
  id: string;
  examId: string;
  orderIndex: number;
  type: string;
  title: string;
  description: string;
  imageUrl: string;
  points: number;
  explanation: string;
  difficulty: number;
  tags: string;
  isRequired: number;
  allowPartialCredit: number;
  options: string;
  matrixConfig: string | null;
  ratingConfig: string | null;
  source: string;
  isApproved: number;
  aiMeta: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ParticipantsTable {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  nationalCode: string;
  meta: string;
  createdAt: number;
  updatedAt: number;
}

export interface AttemptsTable {
  id: string;
  examId: string;
  participantId: string | null;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  participantNationalCode: string;
  isAnonymous: number;
  status: string;
  startedAt: number;
  expiresAt: number | null;
  submittedAt: number | null;
  durationUsedSec: number | null;
  score: number;
  maxScore: number;
  passed: number | null;
  accessCodeUsed: string;
  ip: string;
  userAgent: string;
  gradedBy: string | null;
  gradedAt: number | null;
  gradingNotes: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnswersTable {
  id: string;
  attemptId: string;
  questionId: string;
  value: string;
  isCorrect: number | null;
  pointsAwarded: number;
  maxPoints: number;
  needsManualGrading: number;
  feedback: string;
  gradedBy: string | null;
  gradedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface InvitesTable {
  id: string;
  examId: string;
  code: string;
  label: string;
  maxUses: number;
  usedCount: number;
  expiresAt: number | null;
  isActive: number;
  createdAt: number;
}

export interface AiJobsTable {
  id: string;
  kind: string;
  status: string;
  inputMeta: string | null;
  result: string | null;
  error: string | null;
  createdBy: string | null;
  createdAt: number;
  finishedAt: number | null;
}

export interface AppSettingsTable {
  key: string;
  value: string;
  updatedAt: number;
}

export interface AuditLogsTable {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: string | null;
  ip: string;
  createdAt: number;
}

export interface SchemaMigrationsTable {
  name: string;
  appliedAt: number;
}

export interface Database {
  users: UsersTable;
  courses: CoursesTable;
  exams: ExamsTable;
  questions: QuestionsTable;
  participants: ParticipantsTable;
  attempts: AttemptsTable;
  answers: AnswersTable;
  invites: InvitesTable;
  ai_jobs: AiJobsTable;
  app_settings: AppSettingsTable;
  audit_logs: AuditLogsTable;
  schema_migrations: SchemaMigrationsTable;
}
