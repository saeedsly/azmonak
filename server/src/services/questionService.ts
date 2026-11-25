import type { QuestionInput } from '@azmoonak/shared';
import type { QuestionsTable } from '../db/types.js';
import { newId, nowMs } from '../db/index.js';
import { stringifyJson, toHundredths } from '../db/mappers.js';
import type { QuestionSource } from '@azmoonak/shared';

/** شکل ساده‌ی سوال برای ساخت سریع (ساخت دستی، داده‌ی نمونه یا خروجی هوش مصنوعی). */
export interface QuestionDraft {
  type: QuestionInput['type'];
  title: string;
  description?: string;
  imageUrl?: string;
  points?: number;
  explanation?: string;
  difficulty?: number;
  tags?: string[];
  isRequired?: boolean;
  allowPartialCredit?: boolean;
  options?: Array<{
    id?: string;
    text: string;
    isCorrect?: boolean;
    order?: number;
  }>;
  matrixConfig?: QuestionInput['matrixConfig'];
  ratingConfig?: QuestionInput['ratingConfig'];
}

export function buildQuestionRow(
  examId: string,
  input: QuestionDraft,
  orderIndex: number,
  source: QuestionSource = 'MANUAL',
  aiMeta: Record<string, unknown> | null = null,
): QuestionsTable {

  const now = nowMs();
  const options = (input.options ?? []).map((option, index) => ({
    id: option.id || newId(),
    text: option.text,
    isCorrect: option.isCorrect === true,
    order: option.order ?? index,
  }));

  return {
    id: newId(),
    examId,
    orderIndex,
    type: input.type,
    title: input.title,
    description: input.description ?? '',
    imageUrl: input.imageUrl ?? '',
    points: toHundredths(input.points ?? 1),
    explanation: input.explanation ?? '',
    difficulty: input.difficulty ?? 3,
    tags: stringifyJson(input.tags ?? []),
    isRequired: input.isRequired === false ? 0 : 1,
    allowPartialCredit: input.allowPartialCredit ? 1 : 0,
    options: stringifyJson(options),
    matrixConfig: input.matrixConfig ? stringifyJson(input.matrixConfig) : null,
    ratingConfig: input.ratingConfig ? stringifyJson(input.ratingConfig) : null,
    source,
    isApproved: 1,
    aiMeta: aiMeta ? stringifyJson(aiMeta) : null,
    createdAt: now,
    updatedAt: now,
  };
}

export function questionInputToPatch(
  input: Partial<QuestionInput>,
): Partial<Omit<QuestionsTable, 'id' | 'examId' | 'createdAt'>> {
  const patch: Partial<Omit<QuestionsTable, 'id' | 'examId' | 'createdAt'>> = {};

  if (input.type !== undefined) patch.type = input.type;
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  if (input.points !== undefined) patch.points = toHundredths(input.points);
  if (input.explanation !== undefined) patch.explanation = input.explanation;
  if (input.difficulty !== undefined) patch.difficulty = input.difficulty;
  if (input.tags !== undefined) patch.tags = stringifyJson(input.tags);
  if (input.isRequired !== undefined) patch.isRequired = input.isRequired ? 1 : 0;
  if (input.allowPartialCredit !== undefined) {
    patch.allowPartialCredit = input.allowPartialCredit ? 1 : 0;
  }
  if (input.options !== undefined) {
    patch.options = stringifyJson(
      input.options.map((option, index) => ({
        id: option.id || newId(),
        text: option.text,
        isCorrect: option.isCorrect === true,
        order: option.order ?? index,
      })),
    );
  }
  if (input.matrixConfig !== undefined) {
    patch.matrixConfig = input.matrixConfig ? stringifyJson(input.matrixConfig) : null;
  }
  if (input.ratingConfig !== undefined) {
    patch.ratingConfig = input.ratingConfig ? stringifyJson(input.ratingConfig) : null;
  }
  if (input.orderIndex !== undefined) patch.orderIndex = input.orderIndex;

  return patch;
}
