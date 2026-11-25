import { QUESTION_TYPES } from '@azmoonak/shared';
import { newId } from '../db/index.js';
import { runAI, type AIBlock } from './ai.js';

export interface ParsedOption {
  text: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  type: string;
  title: string;
  description: string;
  options: ParsedOption[];
  points: number;
  difficulty: number;
  explanation: string;
  tags: string[];
  confidence: number;
  warnings: string[];
}

export interface ExtractionResult {
  questions: ParsedQuestion[];
  notes: string;
  provider: string;
  model: string;
  demo: boolean;
}

const QUESTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: [...QUESTION_TYPES] },
          title: { type: 'string', description: 'متن سوال' },
          description: { type: 'string', description: 'توضیح یا زمینه‌ی اضافی' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                isCorrect: { type: 'boolean' },
              },
              required: ['text', 'isCorrect'],
            },
          },
          correctAnswer: { type: 'string', description: 'پاسخ درست به صورت متن' },
          points: { type: 'number', description: 'بارم سوال' },
          difficulty: { type: 'integer', minimum: 1, maximum: 5 },
          explanation: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
        required: ['type', 'title', 'options', 'points'],
      },
    },
    notes: { type: 'string', description: 'توضیحات و هشدارها درباره‌ی کیفیت استخراج' },
  },
  required: ['questions'],
} as const;

const EXTRACTION_SYSTEM = `شما یک دستیار متخصص در «تهیه و ویرایش آزمون و نظرسنجی» هستید. وظیفه‌ی شما استخراج دقیق سوال‌ها از برگه‌ی آزمون (عکس، اسکن یا PDF) و تبدیل آن‌ها به داده‌ی ساختاریافته است.

قواعد اکید:
۱. متن سوال را کامل و بدون خلاصه‌سازی استخراج کنید و نگارش فارسی/عربی و علائم را همان‌طور که در برگه هست حفظ کنید.
۲. هر سوال دقیقاً یک «type» از این فهرست دارد: ${QUESTION_TYPES.join('، ')}.
۳. برای MULTIPLE_CHOICE فقط یک گزینه isCorrect=true باشد و برای MULTIPLE_SELECT می‌تواند چند گزینه درست باشد.
۴. اگر کلید پاسخ در برگه مشخص نیست، هیچ گزینه‌ای را isCorrect نکنید و در notes توضیح دهید کدام سوال‌ها بدون پاسخ هستند.
۵. بارم (points) را از نمره‌ی درج‌شده روی برگه بردارید؛ اگر نبود مقدار ۱ بگذارید.
۶. سوال اضافه نکنید، سوال حذف نکنید و بین دو سوال یکی را انتخاب نکنید.
۷. هیچ توضیح اضافه‌ای بیرون از ساختار JSON ننویسید.`;

const GENERATION_SYSTEM = `شما یک طراح حرفه‌ای آزمون و نظرسنجی هستید. سوال‌هایی تولید می‌کنید که از نظر علمی دقیق، بدون ابهام و متناسب با موضوع درخواستی باشند.
قواعد:
۱. هر سوال دقیقاً یک type از این فهرست دارد: ${QUESTION_TYPES.join('، ')}.
۲. برای سوال‌های چندگزینه‌ای، گزینه‌ها هم‌سطح و بدون پاسخ‌های واضح باشند و گزینه‌ی درست مشخص شود.
۳. بارم سوال‌ها متناسب با دشواری باشد و مجموع بارم قابل اعمال باشد.
۴. متن سوال‌ها به زبان درخواستی (پیش‌فرض فارسی) نوشته شود.
۵. خروجی فقط JSON مطابق ساختار خواسته‌شده باشد.`;

function normalizeQuestion(raw: Record<string, unknown>, index: number): ParsedQuestion {
  const warnings: string[] = [];
  const type = QUESTION_TYPES.includes(raw.type as never) ? String(raw.type) : 'MULTIPLE_CHOICE';
  const title = String(raw.title ?? '').trim();
  if (!title) warnings.push(`سوال شماره ${index + 1} متن ندارد.`);
  if (title.length < 5) warnings.push(`سوال شماره ${index + 1} بسیار کوتاه است؛ بازبینی کنید.`);

  const rawOptions = Array.isArray(raw.options) ? (raw.options as Record<string, unknown>[]) : [];
  let options: ParsedOption[] = rawOptions
    .map((option) => ({
      text: String(option.text ?? '').trim(),
      isCorrect: option.isCorrect === true || option.isCorrect === 'true',
    }))
    .filter((option) => option.text.length > 0);

  const correctAnswerText = raw.correctAnswer ? String(raw.correctAnswer).trim() : '';

  if (type === 'TRUE_FALSE') {
    if (options.length < 2) {
      options = [
        { text: 'صحیح', isCorrect: true },
        { text: 'نادرست', isCorrect: false },
      ];
    }
    if (!options.some((o) => o.isCorrect) && correctAnswerText) {
      const normalized = correctAnswerText.toLowerCase();
      const target = options.find((o) =>
        ['صحیح', 'درست', 'true', 'yes'].some((k) => o.text.toLowerCase().includes(k)),
      );
      if (target && !normalized.includes('نادرست')) target.isCorrect = true;
      else {
        const other = options.find((o) => o !== target);
        if (other) other.isCorrect = true;
      }
    }
  }

  if ((type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_SELECT') && options.length < 2) {
    warnings.push(`سوال شماره ${index + 1} گزینه‌ی کافی ندارد.`);
  }

  if (type === 'MULTIPLE_CHOICE') {
    const correctOnes = options.filter((o) => o.isCorrect);
    if (correctOnes.length > 1) {
      correctOnes.slice(1).forEach((o) => (o.isCorrect = false));
      warnings.push(`سوال شماره ${index + 1} چند پاسخ درست داشت؛ فقط اولی نگه داشته شد.`);
    }
    if (correctOnes.length === 0) {
      warnings.push(`سوال شماره ${index + 1} پاسخ درست ندارد؛ حتماً بازبینی شود.`);
    }
  }

  if (type === 'MULTIPLE_SELECT' && !options.some((o) => o.isCorrect)) {
    warnings.push(`سوال شماره ${index + 1} پاسخ درست ندارد؛ حتماً بازبینی شود.`);
  }

  const pointsRaw = Number(raw.points);
  const points = Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1;
  const difficultyRaw = Number(raw.difficulty);
  const confidenceRaw = Number(raw.confidence);

  return {
    type,
    title,
    description: String(raw.description ?? '').trim(),
    options,
    points,
    difficulty: Number.isFinite(difficultyRaw) ? Math.min(5, Math.max(1, Math.round(difficultyRaw))) : 3,
    explanation: String(raw.explanation ?? '').trim(),
    tags: Array.isArray(raw.tags) ? (raw.tags as unknown[]).map((tag) => String(tag).trim()).filter(Boolean) : [],
    confidence: Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.7,
    warnings,
  };
}

export interface ExtractInput {
  files?: Array<{ buffer: Buffer; mimeType: string; fileName: string }>;
  text?: string;
  instructions?: string;
}

export async function extractQuestions(input: ExtractInput): Promise<ExtractionResult> {
  const blocks: AIBlock[] = [];
  if (input.text?.trim()) {
    blocks.push({ type: 'text', text: `متن برگه‌ی آزمون:\n"""\n${input.text.trim()}\n"""` });
  }
  for (const file of input.files ?? []) {
    blocks.push({
      type: file.mimeType === 'application/pdf' ? 'document' : 'image',
      mediaType: file.mimeType,
      data: file.buffer.toString('base64'),
    });
    blocks.push({
      type: 'text',
      text: `نام فایل پیوست: ${file.fileName}`,
    });
  }

  const extra = input.instructions?.trim()
    ? `\n\nدستور اضافه‌ی کاربر:\n${input.instructions.trim()}`
    : '';

  blocks.push({
    type: 'text',
    text: `برگه‌ی آزمون را بررسی کن و همه‌ی سوال‌های آن را استخراج کن.${extra}`,
  });

  const result = await runAI({
    system: EXTRACTION_SYSTEM,
    content: blocks,
    jsonSchema: QUESTION_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'emit_questions',
    schemaDescription: 'فهرست سوال‌های استخراج‌شده از برگه‌ی آزمون',
    temperature: 0.1,
  });

  const payload = (result.json ?? {}) as { questions?: Record<string, unknown>[]; notes?: string };
  const questions = (payload.questions ?? []).map((raw, index) => normalizeQuestion(raw, index));

  return {
    questions,
    notes: String(payload.notes ?? ''),
    provider: result.provider,
    model: result.model,
    demo: result.demo,
  };
}

export interface GenerateInput {
  topic: string;
  courseTitle?: string;
  questionCount: number;
  types: string[];
  difficulty: number;
  language: string;
}

export async function generateQuestions(input: GenerateInput): Promise<ExtractionResult> {
  const types = input.types.length ? input.types.join('، ') : 'MULTIPLE_CHOICE';
  const content: AIBlock[] = [
    {
      type: 'text',
      text: `موضوع: ${input.topic}
${input.courseTitle ? `دوره: ${input.courseTitle}\n` : ''}تعداد سوال: ${input.questionCount}
نوع سوال‌ها: ${types}
سطح دشواری: ${input.difficulty} از ۵
زبان: ${input.language === 'fa' ? 'فارسی' : 'انگلیسی'}

لطفاً این سوال‌ها را تولید کن.`,
    },
  ];

  const result = await runAI({
    system: GENERATION_SYSTEM,
    content,
    jsonSchema: QUESTION_JSON_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'emit_questions',
    schemaDescription: 'سوال‌های تولید‌شده',
    temperature: 0.6,
  });

  const payload = (result.json ?? {}) as { questions?: Record<string, unknown>[]; notes?: string };
  const questions = (payload.questions ?? []).map((raw, index) => normalizeQuestion(raw, index));

  return {
    questions,
    notes: String(payload.notes ?? ''),
    provider: result.provider,
    model: result.model,
    demo: result.demo,
  };
}

const GRADE_SCHEMA = {
  type: 'object',
  properties: {
    grades: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          pointsAwarded: { type: 'number' },
          feedback: { type: 'string' },
          reasoning: { type: 'string' },
        },
        required: ['index', 'pointsAwarded', 'feedback'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['grades'],
} as const;

export interface GradeSuggestion {
  index: number;
  pointsAwarded: number;
  feedback: string;
  reasoning: string;
}

export async function suggestGrades(input: {
  examTitle: string;
  items: Array<{ question: string; answer: string; maxPoints: number }>;
}): Promise<{ suggestions: GradeSuggestion[]; summary: string; demo: boolean }> {
  const blocks: AIBlock[] = [
    {
      type: 'text',
      text: `آزمون: ${input.examTitle}

برای هر پاسخ تشریحی، نمره‌ی پیشنهادی بین ۰ تا بارم آن سوال بده و دلیل و بازخورد کوتاه بنویس.
فهرست پاسخ‌ها (شماره‌ی هر مورد در فیلد index قرار می‌گیرد):
${input.items
  .map(
    (item, index) =>
      `${index}) سوال: ${item.question}\n   بارم: ${item.maxPoints}\n   پاسخ فراگیر: ${item.answer}`,
  )
  .join('\n\n')}`,
    },
  ];

  const result = await runAI({
    system:
      'شما داور آزمون هستید. نمره‌دهی منصفانه، دقیق و بر اساس محتوای پاسخ انجام می‌دهید. بازخورد را به فارسی روان و کوتاه بنویسید.',
    content: blocks,
    jsonSchema: GRADE_SCHEMA as unknown as Record<string, unknown>,
    schemaName: 'emit_grades',
    schemaDescription: 'نمرات پیشنهادی پاسخ‌های تشریحی',
    temperature: 0.2,
  });

  const payload = (result.json ?? {}) as {
    grades?: Array<Record<string, unknown>>;
    summary?: string;
  };
  const suggestions = (payload.grades ?? []).map((grade) => ({
    index: Number(grade.index ?? 0),
    pointsAwarded: Math.max(0, Number(grade.pointsAwarded ?? 0)),
    feedback: String(grade.feedback ?? ''),
    reasoning: String(grade.reasoning ?? ''),
  }));

  return {
    suggestions,
    summary: String(payload.summary ?? ''),
    demo: result.demo,
  };
}

export async function summarizeSurvey(input: {
  examTitle: string;
  responseCount?: number;
  stats: Record<string, unknown>;
}): Promise<{ summary: string; demo: boolean }> {
  const result = await runAI({
    system:
      'شما تحلیل‌گر داده‌ی نظرسنجی هستید. نتیجه را به فارسی، خلاصه و کاربردی بنویسید (۳ تا ۶ نکته‌ی کلیدی + پیشنهاد اقدام).',
    content: [
      {
        type: 'text',
        text: `عنوان نظرسنجی: ${input.examTitle}\nتعداد کل پاسخ‌ها: ${input.responseCount ?? 0}\n\nآمار پاسخ‌ها:\n${JSON.stringify(input.stats, null, 2)}`,
      },
    ],
    temperature: 0.4,
    maxTokens: 1200,
  });

  return { summary: result.text || 'خلاصه‌ای تولید نشد.', demo: result.demo };
}

export function newOptionId(): string {
  return newId();
}
