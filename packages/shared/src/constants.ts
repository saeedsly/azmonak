import type { ExamStatus, ExamType, QuestionType, UserRole } from './types.js';

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'چندگزینه‌ای (تک پاسخ)',
  MULTIPLE_SELECT: 'چندگزینه‌ای (چند پاسخ)',
  TRUE_FALSE: 'درست / نادرست',
  SHORT_TEXT: 'پاسخ کوتاه',
  LONG_TEXT: 'پاسخ تشریحی',
  FILE_UPLOAD: 'بارگذاری فایل',
  RATING: 'طیف لیکرت',
  MATRIX: 'سوال ماتریسی',
  NUMBER: 'پاسخ عددی',
};

export const QUESTION_TYPE_SHORT_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'تک‌پاسخ',
  MULTIPLE_SELECT: 'چندپاسخ',
  TRUE_FALSE: 'درست/نادرست',
  SHORT_TEXT: 'کوتاه',
  LONG_TEXT: 'تشریحی',
  FILE_UPLOAD: 'فایل',
  RATING: 'طیف لیکرت',
  MATRIX: 'ماتریسی',
  NUMBER: 'عددی',
};

/** سوال‌هایی که به صورت خودکار تصحیح می‌شوند. */
export const AUTO_GRADED_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_SELECT',
  'TRUE_FALSE',
  'NUMBER',
];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  EXAM: 'آزمون',
  SURVEY: 'نظرسنجی',
  POLL: 'نظرخواهی',
};

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  DRAFT: 'پیش‌نویس',
  PUBLISHED: 'منتشر شده',
  CLOSED: 'بسته شده',
  ARCHIVED: 'بایگانی',
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'مدیر کل',
  EDITOR: 'سازنده محتوا',
  REVIEWER: 'داور',
};

/** کدهای دسترسی: ۴ حرف و ۴ رقم، بدون کاراکترهای مبهم (0/O/1/I). */
export const ACCESS_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const DEFAULT_PASS_PERCENT = 50;
export const DEFAULT_DURATION_MINUTES = 45;

export function formatPoints(points: number): string {
  const value = points / 100;
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, '');
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatJalaliDate(ts: number | null | undefined): string {
  if (!ts) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      calendar: 'persian',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString('fa-IR');
  }
}
