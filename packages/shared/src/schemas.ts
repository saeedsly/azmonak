import { z } from 'zod';
import { EXAM_STATUSES, EXAM_TYPES, QUESTION_TYPES, USER_ROLES } from './types.js';

/* ---------------------------------- احراز هویت --------------------------------- */

export const loginSchema = z.object({
  username: z.string().trim().min(3, 'نام کاربری کوتاه است'),
  password: z.string().min(6, 'رمز عبور کوتاه است'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد'),
});

export const createUserSchema = z.object({
  username: z.string().trim().min(3).max(60),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal('')),
  password: z.string().min(8),
  role: z.enum(USER_ROLES).default('EDITOR'),
});

/* ------------------------------------ دوره ------------------------------------ */

/**
 * نکته‌ی مهم: در Zod نسخه ۴ متد `.partial()` روی فیلدهایی که `.default()` دارند،
 * همچنان مقدار پیش‌فرض را اعمال می‌کند و در نتیجه هر ویرایش جزئی، بقیه‌ی فیلدها را ریست می‌کند.
 * به همین دلیل شکل پایه (بدون پیش‌فرض) جدا تعریف می‌شود:
 *  - schema ورودی/ساخت  → با مقدار پیش‌فرض
 *  - schema ویرایش       → فقط همان فیلدهایی که ارسال شده‌اند
 */
const courseFields = {
  title: z.string().trim().min(2, 'عنوان دوره لازم است').max(200),
  description: z.string().max(5000),
  code: z.string().trim().max(50),
  instructor: z.string().trim().max(120),
  color: z.string().trim().max(20),
  isArchived: z.boolean(),
};

export const courseInputSchema = z.object({
  ...courseFields,
  description: courseFields.description.default(''),
  code: courseFields.code.default(''),
  instructor: courseFields.instructor.default(''),
  color: courseFields.color.default(''),
  isArchived: courseFields.isArchived.default(false),
});

export const courseUpdateSchema = z.object(courseFields).partial();

/* ------------------------------------- آزمون ----------------------------------- */

const examFields = {
  title: z.string().trim().min(2, 'عنوان آزمون لازم است').max(200),
  description: z.string().max(5000),
  instructions: z.string().max(5000),
  courseId: z.string().uuid().nullable(),
  type: z.enum(EXAM_TYPES),
  status: z.enum(EXAM_STATUSES),
  durationMinutes: z.number().int().min(0).max(1440),
  maxAttempts: z.number().int().min(0).max(999),
  shuffleQuestions: z.boolean(),
  shuffleOptions: z.boolean(),
  showResultImmediately: z.boolean(),
  showCorrectAnswers: z.boolean(),
  showPerQuestionFeedback: z.boolean(),
  passScore: z.number().int().min(0).max(100),
  startAt: z.number().int().nullable(),
  endAt: z.number().int().nullable(),
  requireName: z.boolean(),
  requireEmail: z.boolean(),
  requirePhone: z.boolean(),
  requireNationalCode: z.boolean(),
  allowAnonymous: z.boolean(),
};

export const examInputSchema = z.object({
  ...examFields,
  description: examFields.description.default(''),
  instructions: examFields.instructions.default(''),
  courseId: examFields.courseId.optional(),
  type: examFields.type.default('EXAM'),
  status: examFields.status.default('DRAFT'),
  durationMinutes: examFields.durationMinutes.default(45),
  maxAttempts: examFields.maxAttempts.default(1),
  shuffleQuestions: examFields.shuffleQuestions.default(false),
  shuffleOptions: examFields.shuffleOptions.default(false),
  showResultImmediately: examFields.showResultImmediately.default(true),
  showCorrectAnswers: examFields.showCorrectAnswers.default(false),
  showPerQuestionFeedback: examFields.showPerQuestionFeedback.default(false),
  passScore: examFields.passScore.default(50),
  startAt: examFields.startAt.optional(),
  endAt: examFields.endAt.optional(),
  requireName: examFields.requireName.default(true),
  requireEmail: examFields.requireEmail.default(false),
  requirePhone: examFields.requirePhone.default(false),
  requireNationalCode: examFields.requireNationalCode.default(false),
  allowAnonymous: examFields.allowAnonymous.default(false),
});

export const examUpdateSchema = z.object(examFields).partial();

/* ------------------------------------- سوال ------------------------------------ */

export const optionSchema = z.object({
  /** شناسه‌ی گزینه اختیاری است؛ اگر ارسال نشود سمت سرور ساخته می‌شود. */
  id: z.string().min(1).optional(),
  text: z.string().min(1, 'متن گزینه لازم است').max(2000),
  isCorrect: z.boolean().default(false),
  order: z.number().int().default(0),
});

export const matrixConfigSchema = z.object({
  rows: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  columns: z.array(z.object({ id: z.string(), text: z.string() })).default([]),
  correct: z.record(z.string(), z.array(z.string())).default({}),
});

export const ratingConfigSchema = z.object({
  min: z.number().int().min(0).max(10).default(1),
  max: z.number().int().min(1).max(10).default(5),
  step: z.number().int().min(1).max(5).default(1),
  minLabel: z.string().default(''),
  maxLabel: z.string().default(''),
  allowText: z.boolean().default(true),
});

const questionFields = {
  type: z.enum(QUESTION_TYPES),
  title: z.string().trim().min(1, 'متن سوال لازم است').max(8000),
  description: z.string().max(8000),
  imageUrl: z.string().max(600),
  points: z.number().min(0).max(10000),
  explanation: z.string().max(8000),
  difficulty: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(60)),
  isRequired: z.boolean(),
  allowPartialCredit: z.boolean(),
  options: z.array(optionSchema),
  matrixConfig: matrixConfigSchema.nullable(),
  ratingConfig: ratingConfigSchema.nullable(),
  orderIndex: z.number().int(),
};

export const questionInputSchema = z.object({
  ...questionFields,
  description: questionFields.description.default(''),
  imageUrl: questionFields.imageUrl.default(''),
  points: questionFields.points.default(1),
  explanation: questionFields.explanation.default(''),
  difficulty: questionFields.difficulty.default(3),
  tags: questionFields.tags.default([]),
  isRequired: questionFields.isRequired.default(true),
  allowPartialCredit: questionFields.allowPartialCredit.default(false),
  options: questionFields.options.default([]),
  matrixConfig: questionFields.matrixConfig.optional(),
  ratingConfig: questionFields.ratingConfig.optional(),
  orderIndex: questionFields.orderIndex.optional(),
});

export const questionUpdateSchema = z.object(questionFields).partial();

export const bulkQuestionSchema = z.object({
  questions: z.array(questionInputSchema).min(1, 'حداقل یک سوال لازم است').max(300),
});

export const reorderQuestionsSchema = z.object({
  order: z.array(z.object({ id: z.string().uuid(), orderIndex: z.number().int() })),
});

/* ------------------------------------ فراگیر ----------------------------------- */

export const participantSchema = z.object({
  name: z.string().trim().max(120).default(''),
  email: z.string().trim().max(160).default(''),
  phone: z.string().trim().max(30).default(''),
  nationalCode: z.string().trim().max(30).default(''),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export const startAttemptSchema = participantSchema.extend({
  accessCode: z.string().trim().min(3).max(64),
  consent: z.boolean().default(false),
});

export const answerUpsertSchema = z.object({
  value: z.unknown(),
});

export const submitAttemptSchema = z.object({
  autoSubmit: z.boolean().default(false),
});

/* ------------------------------------- داوری ----------------------------------- */

export const manualGradeSchema = z.object({
  answerId: z.string().uuid(),
  pointsAwarded: z.number().min(0).max(10000),
  feedback: z.string().max(4000).default(''),
});

export const bulkGradeSchema = z.object({
  attemptId: z.string().uuid(),
  grades: z
    .array(
      z.object({
        answerId: z.string().uuid(),
        pointsAwarded: z.number().min(0).max(10000),
        feedback: z.string().max(4000).default(''),
      }),
    )
    .default([]),
});

/* ------------------------------------- کدها ------------------------------------ */

export const inviteInputSchema = z.object({
  count: z.number().int().min(1).max(200).default(10),
  label: z.string().trim().max(120).default(''),
  maxUses: z.number().int().min(1).max(999).default(1),
  expiresAt: z.number().int().nullable().optional(),
});

/* --------------------------------------- AI ------------------------------------ */

export const aiImportSchema = z.object({
  examId: z.string().uuid().optional(),
  fileName: z.string().default(''),
  mimeType: z.string().default(''),
  instructions: z.string().max(2000).default(''),
});

export const aiGenerateSchema = z.object({
  topic: z.string().trim().min(3, 'موضوع را مشخص کنید').max(2000),
  courseTitle: z.string().max(200).default(''),
  questionCount: z.number().int().min(1).max(60).default(10),
  types: z.array(z.enum(QUESTION_TYPES)).default(['MULTIPLE_CHOICE', 'TRUE_FALSE']),
  difficulty: z.number().int().min(1).max(5).default(3),
  language: z.enum(['fa', 'en']).default('fa'),
});

export const aiClassifySchema = z.object({
  text: z.string().trim().min(3).max(8000),
});

/* ------------------------------------- خروجی ---------------------------------- */

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().default(''),
  courseId: z.string().uuid().optional(),
  status: z.enum(EXAM_STATUSES).optional(),
  type: z.enum(EXAM_TYPES).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CourseInput = z.infer<typeof courseInputSchema>;
export type ExamInput = z.infer<typeof examInputSchema>;
export type QuestionInput = z.infer<typeof questionInputSchema>;
export type ParticipantInput = z.infer<typeof participantSchema>;
export type StartAttemptInput = z.infer<typeof startAttemptSchema>;
export type AiImportInput = z.infer<typeof aiImportSchema>;
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;
export type InviteInput = z.infer<typeof inviteInputSchema>;
export type ManualGradeInput = z.infer<typeof manualGradeSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
