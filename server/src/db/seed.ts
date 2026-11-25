import type { Kysely } from 'kysely';
import type { Database } from './types.js';
import { createCourse, createExam, createUser, findUserByUsername, listCourses } from './repos.js';
import { hashPassword } from '../lib/auth.js';
import { buildQuestionRow } from '../services/questionService.js';
import { insertQuestion, nextOrderIndex } from './repos.js';
import { generateAccessCode } from '../lib/codes.js';
import { ensureRuntimeDirs } from '../config.js';

export const DEFAULT_ADMIN = {
  username: 'admin',
  password: 'Admin@1234',
  fullName: 'مدیر سیستم',
};

const DEMO_QUESTIONS = [
  {
    type: 'MULTIPLE_CHOICE' as const,
    title: 'کدام‌یک از موارد زیر وظیفه‌ی لایه‌ی شبکه در مدل OSI را بر عهده دارد؟',
    description: '',
    options: [
      { id: '', text: 'مسیریابی بسته‌ها بین شبکه‌ها', isCorrect: true, order: 0 },
      { id: '', text: 'نمایش داده به کاربر', isCorrect: false, order: 1 },
      { id: '', text: 'کدگذاری و رمزنگاری', isCorrect: false, order: 2 },
      { id: '', text: 'ارسال فیزیکی بیت‌ها روی کابل', isCorrect: false, order: 3 },
    ],
    points: 2,
    difficulty: 2,
    explanation: 'لایه‌ی شبکه مسئول آدرس‌دهی و مسیریابی است.',
    tags: ['شبکه', 'OSI'],
    isRequired: true,
    allowPartialCredit: false,
  },
  {
    type: 'MULTIPLE_SELECT' as const,
    title: 'کدام‌یک از سرویس‌های زیر در لایه‌ی کاربرد ارائه می‌شوند؟',
    description: '',
    options: [
      { id: '', text: 'HTTP', isCorrect: true, order: 0 },
      { id: '', text: 'DNS', isCorrect: true, order: 1 },
      { id: '', text: 'Ethernet', isCorrect: false, order: 2 },
      { id: '', text: 'ARP', isCorrect: false, order: 3 },
    ],
    points: 3,
    difficulty: 3,
    explanation: '',
    tags: ['شبکه'],
    isRequired: true,
    allowPartialCredit: false,
  },
  {
    type: 'TRUE_FALSE' as const,
    title: 'در مدل OSI، لایه‌ی Session مسئول مدیریت نشست‌های ارتباطی است.',
    description: '',
    options: [
      { id: '', text: 'صحیح', isCorrect: true, order: 0 },
      { id: '', text: 'نادرست', isCorrect: false, order: 1 },
    ],
    points: 1,
    difficulty: 1,
    explanation: '',
    tags: [],
    isRequired: true,
    allowPartialCredit: false,
  },
  {
    type: 'SHORT_TEXT' as const,
    title: 'یک دلیل استفاده از زیرشبکه (Subnet) را به‌صورت کوتاه توضیح دهید.',
    description: '',
    options: [],
    points: 5,
    difficulty: 4,
    explanation: 'تفکیک شبکه، مدیریت بهتر و افزایش امنیت.',
    tags: [],
    isRequired: true,
    allowPartialCredit: false,
  },
  {
    type: 'RATING' as const,
    title: 'میزان رضایت شما از کیفیت محتوای این دوره چقدر است؟',
    description: '',
    options: [],
    points: 0,
    difficulty: 1,
    explanation: '',
    tags: [],
    isRequired: true,
    allowPartialCredit: false,
    ratingConfig: {
      min: 1,
      max: 5,
      step: 1,
      minLabel: 'بسیار ضعیف',
      maxLabel: 'عالی',
      allowText: true,
    },
  },
];

export async function seed(db: Kysely<Database>): Promise<void> {
  let admin = await findUserByUsername(db, DEFAULT_ADMIN.username);
  if (!admin) {
    admin = await createUser(db, {
      username: DEFAULT_ADMIN.username,
      email: null,
      passwordHash: await hashPassword(DEFAULT_ADMIN.password),
      fullName: DEFAULT_ADMIN.fullName,
      role: 'ADMIN',
    });
    console.log(`✅ کاربر مدیر ساخته شد: ${DEFAULT_ADMIN.username} / ${DEFAULT_ADMIN.password}`);
  }

  const courses = await listCourses(db, { includeArchived: true });
  if (courses.length > 0) return;

  const course = await createCourse(db, {
    title: 'دوره‌ی نمونه‌ی شبکه‌های کامپیوتری',
    description: 'دوره‌ی آموزشی مقدماتی برای آشنایی با مفاهیم پایه‌ی شبکه و مدل OSI.',
    code: 'NET-101',
    instructor: 'استاد نمونه',
    color: '#4f46e5',
    createdBy: admin.id,
  });

  const exam = await createExam(db, {
    courseId: course.id,
    title: 'آزمون پایانی دوره‌ی شبکه',
    description: 'آزمون خودکار برای سنجش یادگیری فراگیران.',
    instructions: 'به همه‌ی سوال‌ها پاسخ دهید. برای سوال‌های تشریحی، پاسخ کوتاه کافی است.',
    type: 'EXAM',
    status: 'PUBLISHED',
    accessCode: generateAccessCode(),
    durationMinutes: 30,
    maxAttempts: 3,
    shuffleQuestions: 0,
    shuffleOptions: 0,
    showResultImmediately: 1,
    showCorrectAnswers: 0,
    showPerQuestionFeedback: 1,
    passScore: 60,
    requireName: 1,
    requireEmail: 0,
    requirePhone: 0,
    requireNationalCode: 0,
    allowAnonymous: 0,
    createdBy: admin.id,
  });

  let order = await nextOrderIndex(db, exam.id);
  for (const question of DEMO_QUESTIONS) {
    const row = buildQuestionRow(exam.id, question, order);
    await insertQuestion(db, row);
    order += 1;
  }

  const survey = await createExam(db, {
    courseId: course.id,
    title: 'نظرسنجی رضایت از دوره',
    description: 'لطفاً تجربه‌ی خود از دوره را با ما در میان بگذارید.',
    instructions: '',
    type: 'SURVEY',
    status: 'PUBLISHED',
    accessCode: generateAccessCode(),
    durationMinutes: 10,
    maxAttempts: 0,
    showResultImmediately: 1,
    passScore: 0,
    requireName: 0,
    requireEmail: 0,
    requirePhone: 0,
    requireNationalCode: 0,
    allowAnonymous: 1,
    createdBy: admin.id,
  });

  let surveyOrder = await nextOrderIndex(db, survey.id);
  for (const question of DEMO_QUESTIONS) {
    const row = buildQuestionRow(survey.id, question, surveyOrder);
    await insertQuestion(db, row);
    surveyOrder += 1;
  }

  console.log('✅ داده‌های نمونه (دوره، آزمون و نظرسنجی) ساخته شد.');
  console.log(`   کد آزمون: ${exam.accessCode}`);
  console.log(`   کد نظرسنجی: ${survey.accessCode}`);
}

export async function seedIfEmpty(): Promise<void> {
  const { getDb } = await import('./index.js');
  const db = await getDb();
  await seed(db);
}

async function main(): Promise<void> {
  ensureRuntimeDirs();
  const { getDb, closeDb } = await import('./index.js');
  const { runMigrations } = await import('./migrations.js');
  const db = await getDb();
  await runMigrations(db);
  await seed(db);
  await closeDb();
}

const isDirectRun =
  process.argv[1]?.endsWith('seed.ts') === true || process.argv[1]?.endsWith('seed.js') === true;

if (isDirectRun) {
  main().catch((error) => {
    console.error('❌ خطا در ایجاد داده‌های نمونه:', error);
    process.exit(1);
  });
}
