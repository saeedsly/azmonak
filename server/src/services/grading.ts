import type { QuestionsTable } from '../db/types.js';
import { parseJson } from '../db/mappers.js';
import type { OptionDto } from '@azmoonak/shared';

export interface GradeResult {
  isCorrect: boolean | null;
  pointsAwarded: number;
  needsManualGrading: boolean;
}

const EMPTY: GradeResult = { isCorrect: false, pointsAwarded: 0, needsManualGrading: false };

function optionsOf(question: QuestionsTable): OptionDto[] {
  return parseJson<OptionDto[]>(question.options, []);
}

function correctIds(question: QuestionsTable): string[] {
  return optionsOf(question)
    .filter((o) => o.isCorrect)
    .map((o) => o.id);
}

function asArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

/** تصحیح خودکار یک پاسخ. امتیازها با ضریب ۱۰۰ (هundredths) هستند. */
export function gradeAnswer(question: QuestionsTable, value: unknown): GradeResult {
  const maxPoints = question.points;
  const empty = isEmptyValue(value);

  switch (question.type) {
    case 'MULTIPLE_CHOICE': {
      if (empty) return EMPTY;
      const selected = asArray(value)[0];
      const correct = correctIds(question);
      const isCorrect = correct.includes(selected);
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
        needsManualGrading: false,
      };
    }

    case 'MULTIPLE_SELECT': {
      if (empty) return EMPTY;
      const selected = new Set(asArray(value));
      const correct = new Set(correctIds(question));
      if (correct.size === 0) {
        return { isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
      }
      let hits = 0;
      let wrong = 0;
      for (const id of selected) {
        if (correct.has(id)) hits += 1;
        else wrong += 1;
      }
      const isExact = hits === correct.size && wrong === 0;
      if (isExact) {
        return { isCorrect: true, pointsAwarded: maxPoints, needsManualGrading: false };
      }
      if (question.allowPartialCredit) {
        const ratio = Math.max(0, (hits - wrong) / correct.size);
        return {
          isCorrect: false,
          pointsAwarded: Math.round(maxPoints * ratio),
          needsManualGrading: false,
        };
      }
      return { isCorrect: false, pointsAwarded: 0, needsManualGrading: false };
    }

    case 'TRUE_FALSE': {
      if (empty) return EMPTY;
      const selected = asArray(value)[0];
      const correct = correctIds(question);
      const isCorrect = correct.includes(selected);
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
        needsManualGrading: false,
      };
    }

    case 'NUMBER': {
      if (empty) return EMPTY;
      const answer = parseJson<{ text?: string; tolerance?: number }>(String(value ?? ''), {});
      const given = Number(answer.text ?? value);
      const expected = Number(answer.text);
      if (!Number.isFinite(given) || !Number.isFinite(expected)) {
        return { isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
      }
      const tolerance = answer.tolerance ?? 0;
      const isCorrect = Math.abs(given - expected) <= tolerance + Math.abs(expected) * 1e-9;
      return {
        isCorrect,
        pointsAwarded: isCorrect ? maxPoints : 0,
        needsManualGrading: false,
      };
    }

    case 'SHORT_TEXT':
    case 'LONG_TEXT':
    case 'FILE_UPLOAD': {
      if (empty) return EMPTY;
      return { isCorrect: null, pointsAwarded: 0, needsManualGrading: true };
    }

    case 'RATING':
    case 'MATRIX': {
      // در نظرسنجی‌ها امتیازدهی معنایی ندارد؛ پاسخ صرفاً ثبت می‌شود.
      return { isCorrect: null, pointsAwarded: 0, needsManualGrading: false };
    }

    default:
      return EMPTY;
  }
}

/** آیا این نوع سوال نیاز به تصحیح انسانی دارد؟ */
export function requiresManualGrading(question: QuestionsTable): boolean {
  return ['SHORT_TEXT', 'LONG_TEXT', 'FILE_UPLOAD', 'MATRIX'].includes(question.type);
}

export function computePassed(
  scoreHundredths: number,
  maxScoreHundredths: number,
  passPercent: number,
): boolean {
  if (maxScoreHundredths <= 0) return true;
  const percent = (scoreHundredths / maxScoreHundredths) * 100;
  return percent + 1e-9 >= passPercent;
}
