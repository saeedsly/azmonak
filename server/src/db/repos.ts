import type { Kysely } from 'kysely';
import { newId, nowMs } from './index.js';
import { stringifyJson } from './mappers.js';
import type {
  AiJobsTable,
  AnswersTable,
  AttemptsTable,
  CoursesTable,
  Database,
  ExamsTable,
  InvitesTable,
  ParticipantsTable,
  QuestionsTable,
  UsersTable,
} from './types.js';

type Db = Kysely<Database>;

const id = () => newId();
const ts = () => nowMs();

/* ================================== کاربران ================================== */

export async function findUserByUsername(db: Db, username: string): Promise<UsersTable | undefined> {
  return db
    .selectFrom('users')
    .selectAll()
    .where('username', '=', username)
    .executeTakeFirst();
}

export async function findUserById(db: Db, userId: string): Promise<UsersTable | undefined> {
  return db.selectFrom('users').selectAll().where('id', '=', userId).executeTakeFirst();
}

export async function listUsers(db: Db): Promise<UsersTable[]> {
  return db.selectFrom('users').selectAll().orderBy('createdAt', 'asc').execute();
}

export async function createUser(
  db: Db,
  input: {
    username: string;
    email?: string | null;
    passwordHash: string;
    fullName: string;
    role: string;
  },
): Promise<UsersTable> {
  const row: UsersTable = {
    id: id(),
    username: input.username,
    email: input.email || null,
    passwordHash: input.passwordHash,
    fullName: input.fullName,
    role: input.role,
    isActive: 1,
    lastLoginAt: null,
    createdAt: ts(),
    updatedAt: ts(),
  };
  await db.insertInto('users').values(row).execute();
  return row;
}

export async function updateUser(
  db: Db,
  userId: string,
  patch: Partial<Omit<UsersTable, 'id' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('users')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', userId)
    .execute();
}

export async function touchUserLogin(db: Db, userId: string): Promise<void> {
  await db
    .updateTable('users')
    .set({ lastLoginAt: ts(), updatedAt: ts() } as never)
    .where('id', '=', userId)
    .execute();
}

export async function countAdmins(db: Db): Promise<number> {
  const result = await db
    .selectFrom('users')
    .select((eb) => eb.fn.countAll<number>().as('c'))
    .where('role', '=', 'ADMIN')
    .where('isActive', '=', 1)
    .executeTakeFirst();
  return Number(result?.c ?? 0);
}

/* =================================== دوره‌ها ================================= */

export interface CourseFilter {
  search?: string;
  includeArchived?: boolean;
}

export async function listCourses(db: Db, filter: CourseFilter = {}) {
  let query = db
    .selectFrom('courses')
    .selectAll('courses')
    .select((eb) =>
      eb
        .selectFrom('exams')
        .select(eb.fn.countAll<number>().as('c'))
        .whereRef('exams.courseId', '=', 'courses.id')
        .as('examCount'),
    )
    .select((eb) =>
      eb
        .selectFrom('questions')
        .innerJoin('exams', 'exams.id', 'questions.examId')
        .select(eb.fn.countAll<number>().as('c'))
        .whereRef('exams.courseId', '=', 'courses.id')
        .as('questionCount'),
    )
    .orderBy('courses.createdAt', 'desc');

  if (!filter.includeArchived) {
    query = query.where('courses.isArchived', '=', 0);
  }
  if (filter.search) {
    const like = `%${filter.search}%`;
    query = query.where((eb) =>
      eb.or([
        eb('courses.title', 'like', like),
        eb('courses.code', 'like', like),
        eb('courses.instructor', 'like', like),
      ]),
    );
  }
  return query.execute();
}

export async function getCourse(db: Db, courseId: string): Promise<CoursesTable | undefined> {
  return db.selectFrom('courses').selectAll().where('id', '=', courseId).executeTakeFirst();
}

export async function createCourse(
  db: Db,
  input: {
    title: string;
    description?: string;
    code?: string;
    instructor?: string;
    color?: string;
    isArchived?: boolean;
    createdBy?: string | null;
  },
): Promise<CoursesTable> {
  const row: CoursesTable = {
    id: id(),
    title: input.title,
    description: input.description ?? '',
    code: input.code ?? '',
    instructor: input.instructor ?? '',
    color: input.color ?? '',
    isArchived: input.isArchived ? 1 : 0,
    createdBy: input.createdBy ?? null,
    createdAt: ts(),
    updatedAt: ts(),
  };
  await db.insertInto('courses').values(row).execute();
  return row;
}

export async function updateCourse(
  db: Db,
  courseId: string,
  patch: Partial<Omit<CoursesTable, 'id' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('courses')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', courseId)
    .execute();
}

export async function deleteCourse(db: Db, courseId: string): Promise<void> {
  await db.deleteFrom('courses').where('id', '=', courseId).execute();
}

/* ==================================== آزمون‌ها ================================ */

export interface ExamFilter {
  search?: string;
  courseId?: string;
  status?: string;
  type?: string;
  page?: number;
  pageSize?: number;
}

export async function listExams(db: Db, filter: ExamFilter = {}) {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 50;

  let base = db
    .selectFrom('exams')
    .leftJoin('courses', 'courses.id', 'exams.courseId')
    .selectAll('exams')
    .select('courses.title as courseTitle')
    .select((eb) =>
      eb
        .selectFrom('questions')
        .select(eb.fn.countAll<number>().as('c'))
        .whereRef('questions.examId', '=', 'exams.id')
        .as('questionCount'),
    )
    .select((eb) =>
      eb
        .selectFrom('attempts')
        .select(eb.fn.countAll<number>().as('c'))
        .whereRef('attempts.examId', '=', 'exams.id')
        .as('attemptCount'),
    )
    .orderBy('exams.createdAt', 'desc');

  if (filter.search) {
    const like = `%${filter.search}%`;
    base = base.where((eb) =>
      eb.or([eb('exams.title', 'like', like), eb('exams.accessCode', 'like', like)]),
    );
  }
  if (filter.courseId) base = base.where('exams.courseId', '=', filter.courseId);
  if (filter.status) base = base.where('exams.status', '=', filter.status);
  if (filter.type) base = base.where('exams.type', '=', filter.type);

  const rows = await base.limit(pageSize).offset((page - 1) * pageSize).execute();

  const countRow = await db
    .selectFrom('exams')
    .select((eb) => eb.fn.countAll<number>().as('c'))
    .executeTakeFirst();

  return { rows, total: Number(countRow?.c ?? 0) };
}

export async function getExam(db: Db, examId: string): Promise<ExamsTable | undefined> {
  return db.selectFrom('exams').selectAll().where('id', '=', examId).executeTakeFirst();
}

export async function getExamWithCourse(db: Db, examId: string) {
  return db
    .selectFrom('exams')
    .leftJoin('courses', 'courses.id', 'exams.courseId')
    .selectAll('exams')
    .select('courses.title as courseTitle')
    .where('exams.id', '=', examId)
    .executeTakeFirst();
}

export async function findExamByAccessCode(db: Db, code: string): Promise<ExamsTable | undefined> {
  const normalized = code.trim().toUpperCase();
  return db.selectFrom('exams').selectAll().where('accessCode', '=', normalized).executeTakeFirst();
}

export async function createExam(
  db: Db,
  input: Partial<ExamsTable> & { title: string; accessCode: string },
): Promise<ExamsTable> {
  const now = ts();
  const row: ExamsTable = {
    id: id(),
    courseId: input.courseId ?? null,
    title: input.title,
    description: input.description ?? '',
    instructions: input.instructions ?? '',
    type: input.type ?? 'EXAM',
    status: input.status ?? 'DRAFT',
    accessCode: input.accessCode,
    durationMinutes: input.durationMinutes ?? 45,
    maxAttempts: input.maxAttempts ?? 1,
    shuffleQuestions: input.shuffleQuestions ?? 0,
    shuffleOptions: input.shuffleOptions ?? 0,
    showResultImmediately: input.showResultImmediately ?? 1,
    showCorrectAnswers: input.showCorrectAnswers ?? 0,
    showPerQuestionFeedback: input.showPerQuestionFeedback ?? 0,
    passScore: input.passScore ?? 50,
    startAt: input.startAt ?? null,
    endAt: input.endAt ?? null,
    requireName: input.requireName ?? 1,
    requireEmail: input.requireEmail ?? 0,
    requirePhone: input.requirePhone ?? 0,
    requireNationalCode: input.requireNationalCode ?? 0,
    allowAnonymous: input.allowAnonymous ?? 0,
    createdBy: input.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insertInto('exams').values(row).execute();
  return row;
}

export async function updateExam(
  db: Db,
  examId: string,
  patch: Partial<Omit<ExamsTable, 'id' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('exams')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', examId)
    .execute();
}

export async function deleteExam(db: Db, examId: string): Promise<void> {
  await db.deleteFrom('exams').where('id', '=', examId).execute();
}

export async function examAggregates(db: Db, examId: string) {
  const totals = await db
    .selectFrom('questions')
    .select((eb) => eb.fn.countAll<number>().as('questionCount'))
    .select((eb) => eb.fn.sum<number>('questions.points').as('totalPoints'))
    .where('examId', '=', examId)
    .executeTakeFirst();

  const attempts = await db
    .selectFrom('attempts')
    .select((eb) => eb.fn.countAll<number>().as('attemptCount'))
    .where('examId', '=', examId)
    .where('status', '!=', 'IN_PROGRESS')
    .executeTakeFirst();

  const averages = await db
    .selectFrom('attempts')
    .select((eb) => eb.fn.avg<number>('score').as('avgScore'))
    .where('examId', '=', examId)
    .where('status', '!=', 'IN_PROGRESS')
    .executeTakeFirst();

  return {
    questionCount: Number(totals?.questionCount ?? 0),
    totalPoints: Number(totals?.totalPoints ?? 0),
    attemptCount: Number(attempts?.attemptCount ?? 0),
    averageScore: Number(averages?.avgScore ?? 0),
  };
}

/* ==================================== سوال‌ها ================================= */

export async function listQuestions(db: Db, examId: string): Promise<QuestionsTable[]> {
  return db
    .selectFrom('questions')
    .selectAll()
    .where('examId', '=', examId)
    .orderBy('orderIndex', 'asc')
    .execute();
}

export async function getQuestion(db: Db, questionId: string): Promise<QuestionsTable | undefined> {
  return db.selectFrom('questions').selectAll().where('id', '=', questionId).executeTakeFirst();
}

export async function nextOrderIndex(db: Db, examId: string): Promise<number> {
  const row = await db
    .selectFrom('questions')
    .select((eb) => eb.fn.max<number>('orderIndex').as('max'))
    .where('examId', '=', examId)
    .executeTakeFirst();
  return Number(row?.max ?? 0) + 1;
}

export async function insertQuestion(db: Db, row: QuestionsTable): Promise<QuestionsTable> {
  await db.insertInto('questions').values(row).execute();
  return row;
}

export async function updateQuestion(
  db: Db,
  questionId: string,
  patch: Partial<Omit<QuestionsTable, 'id' | 'examId' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('questions')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', questionId)
    .execute();
}

export async function deleteQuestion(db: Db, questionId: string): Promise<void> {
  await db.deleteFrom('questions').where('id', '=', questionId).execute();
}

export async function reorderQuestions(
  db: Db,
  examId: string,
  order: Array<{ id: string; orderIndex: number }>,
): Promise<void> {
  for (const item of order) {
    await db
      .updateTable('questions')
      .set({ orderIndex: item.orderIndex, updatedAt: ts() } as never)
      .where('id', '=', item.id)
      .where('examId', '=', examId)
      .execute();
  }
}

/* ================================== فراگیران ================================= */

export async function upsertParticipant(
  db: Db,
  input: {
    fullName: string;
    email: string;
    phone: string;
    nationalCode: string;
    meta?: Record<string, unknown>;
  },
): Promise<ParticipantsTable> {
  const existing = input.email
    ? await db
        .selectFrom('participants')
        .selectAll()
        .where('email', '=', input.email)
        .executeTakeFirst()
    : undefined;

  const now = ts();
  if (existing) {
    await db
      .updateTable('participants')
      .set({
        fullName: input.fullName || existing.fullName,
        phone: input.phone || existing.phone,
        nationalCode: input.nationalCode || existing.nationalCode,
        meta: stringifyJson(input.meta ?? {}),
        updatedAt: now,
      } as never)
      .where('id', '=', existing.id)
      .execute();
    return { ...existing, fullName: input.fullName || existing.fullName };
  }

  const row: ParticipantsTable = {
    id: id(),
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    nationalCode: input.nationalCode,
    meta: stringifyJson(input.meta ?? {}),
    createdAt: now,
  };
  await db.insertInto('participants').values(row).execute();
  return row;
}

export async function listParticipants(db: Db, limit = 200): Promise<ParticipantsTable[]> {
  return db
    .selectFrom('participants')
    .selectAll()
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .execute();
}

/* ==================================== تلاش‌ها ================================= */

export async function createAttempt(db: Db, row: AttemptsTable): Promise<AttemptsTable> {
  await db.insertInto('attempts').values(row).execute();
  return row;
}

export async function getAttempt(db: Db, attemptId: string): Promise<AttemptsTable | undefined> {
  return db.selectFrom('attempts').selectAll().where('id', '=', attemptId).executeTakeFirst();
}

export async function getAttemptWithExam(db: Db, attemptId: string) {
  return db
    .selectFrom('attempts')
    .innerJoin('exams', 'exams.id', 'attempts.examId')
    .selectAll('attempts')
    .select([
      'exams.title as examTitle',
      'exams.type as examType',
      'exams.status as examStatus',
      'exams.showResultImmediately as examShowResultImmediately',
      'exams.showCorrectAnswers as examShowCorrectAnswers',
      'exams.showPerQuestionFeedback as examShowPerQuestionFeedback',
      'exams.passScore as examPassScore',
      'exams.durationMinutes as examDurationMinutes',
      'exams.shuffleQuestions as examShuffleQuestions',
      'exams.shuffleOptions as examShuffleOptions',
    ])
    .where('attempts.id', '=', attemptId)
    .executeTakeFirst();
}

export async function updateAttempt(
  db: Db,
  attemptId: string,
  patch: Partial<Omit<AttemptsTable, 'id' | 'examId' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('attempts')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', attemptId)
    .execute();
}

export interface AttemptFilter {
  examId?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listAttempts(db: Db, filter: AttemptFilter = {}) {
  const page = filter.page ?? 1;
  const pageSize = filter.pageSize ?? 50;

  let query = db
    .selectFrom('attempts')
    .innerJoin('exams', 'exams.id', 'attempts.examId')
    .selectAll('attempts')
    .select('exams.title as examTitle');

  if (filter.examId) query = query.where('attempts.examId', '=', filter.examId);
  if (filter.status) query = query.where('attempts.status', '=', filter.status);
  if (filter.search) {
    const like = `%${filter.search}%`;
    query = query.where((eb) =>
      eb.or([
        eb('attempts.participantName', 'like', like),
        eb('attempts.participantEmail', 'like', like),
        eb('attempts.participantNationalCode', 'like', like),
      ]),
    );
  }

  const rows = await query
    .orderBy('attempts.createdAt', 'desc')
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute();

  const countRow = await db
    .selectFrom('attempts')
    .select((eb) => eb.fn.countAll<number>().as('c'))
    .where('examId', '=', filter.examId ?? '')
    .executeTakeFirst();

  return { rows, total: Number(countRow?.c ?? 0) };
}

export async function countAttemptsForIdentity(
  db: Db,
  examId: string,
  identity: { name?: string; email?: string; nationalCode?: string },
): Promise<number> {
  let query = db
    .selectFrom('attempts')
    .select((eb) => eb.fn.countAll<number>().as('c'))
    .where('examId', '=', examId)
    .where('status', '!=', 'IN_PROGRESS');

  if (identity.email) {
    query = query.where('participantEmail', '=', identity.email);
  } else if (identity.nationalCode) {
    query = query.where('participantNationalCode', '=', identity.nationalCode);
  } else if (identity.name) {
    query = query.where('participantName', '=', identity.name);
  } else {
    return 0;
  }

  const row = await query.executeTakeFirst();
  return Number(row?.c ?? 0);
}

/* ==================================== پاسخ‌ها ================================== */

export async function listAnswers(db: Db, attemptId: string): Promise<AnswersTable[]> {
  return db.selectFrom('answers').selectAll().where('attemptId', '=', attemptId).execute();
}

export async function getAnswer(db: Db, answerId: string): Promise<AnswersTable | undefined> {
  return db.selectFrom('answers').selectAll().where('id', '=', answerId).executeTakeFirst();
}

export async function upsertAnswer(db: Db, row: AnswersTable): Promise<void> {
  const existing = await db
    .selectFrom('answers')
    .selectAll()
    .where('attemptId', '=', row.attemptId)
    .where('questionId', '=', row.questionId)
    .executeTakeFirst();

  if (existing) {
    await db
      .updateTable('answers')
      .set({
        value: row.value,
        updatedAt: ts(),
      } as never)
      .where('id', '=', existing.id)
      .execute();
    return;
  }
  await db.insertInto('answers').values(row).execute();
}

export async function updateAnswer(
  db: Db,
  answerId: string,
  patch: Partial<Omit<AnswersTable, 'id' | 'attemptId' | 'questionId' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('answers')
    .set({ ...patch, updatedAt: ts() } as never)
    .where('id', '=', answerId)
    .execute();
}

export async function answersForQuestion(db: Db, questionId: string): Promise<AnswersTable[]> {
  return db.selectFrom('answers').selectAll().where('questionId', '=', questionId).execute();
}

export async function deleteAnswersForAttempt(db: Db, attemptId: string): Promise<void> {
  await db.deleteFrom('answers').where('attemptId', '=', attemptId).execute();
}

/* ==================================== دعوت‌نامه =============================== */

export async function listInvites(db: Db, examId: string): Promise<InvitesTable[]> {
  return db.selectFrom('invites').selectAll().where('examId', '=', examId).execute();
}

export async function findInviteByCode(db: Db, code: string): Promise<InvitesTable | undefined> {
  return db
    .selectFrom('invites')
    .selectAll()
    .where('code', '=', code.trim().toUpperCase())
    .executeTakeFirst();
}

export async function createInvite(db: Db, row: InvitesTable): Promise<InvitesTable> {
  await db.insertInto('invites').values(row).execute();
  return row;
}

export async function incrementInviteUsage(db: Db, inviteId: string): Promise<void> {
  const row = await db
    .selectFrom('invites')
    .select('usedCount')
    .where('id', '=', inviteId)
    .executeTakeFirst();
  await db
    .updateTable('invites')
    .set({ usedCount: Number(row?.usedCount ?? 0) + 1 } as never)
    .where('id', '=', inviteId)
    .execute();
}

export async function deactivateInvite(db: Db, inviteId: string): Promise<void> {
  await db.updateTable('invites').set({ isActive: 0 } as never).where('id', '=', inviteId).execute();
}

/* ================================== کارهای AI ================================= */

export async function createAiJob(
  db: Db,
  input: { kind: string; inputMeta?: Record<string, unknown>; createdBy?: string | null },
): Promise<AiJobsTable> {
  const row: AiJobsTable = {
    id: id(),
    kind: input.kind,
    status: 'PENDING',
    inputMeta: input.inputMeta ? stringifyJson(input.inputMeta) : null,
    result: null,
    error: null,
    createdBy: input.createdBy ?? null,
    createdAt: ts(),
    finishedAt: null,
  };
  await db.insertInto('ai_jobs').values(row).execute();
  return row;
}

export async function updateAiJob(
  db: Db,
  jobId: string,
  patch: Partial<Omit<AiJobsTable, 'id' | 'createdAt'>>,
): Promise<void> {
  await db
    .updateTable('ai_jobs')
    .set(patch as never)
    .where('id', '=', jobId)
    .execute();
}

export async function listAiJobs(db: Db, limit = 50): Promise<AiJobsTable[]> {
  return db.selectFrom('ai_jobs').selectAll().orderBy('createdAt', 'desc').limit(limit).execute();
}

/* ================================== تنظیمات ================================== */

export async function getSetting(db: Db, key: string): Promise<unknown> {
  const row = await db.selectFrom('app_settings').selectAll().where('key', '=', key).executeTakeFirst();
  if (!row) return undefined;
  try {
    return JSON.parse(row.value);
  } catch {
    return row.value;
  }
}

export async function setSetting(db: Db, key: string, value: unknown): Promise<void> {
  const payload = JSON.stringify(value ?? null);
  const existing = await db
    .selectFrom('app_settings')
    .select('key')
    .where('key', '=', key)
    .executeTakeFirst();
  if (existing) {
    await db.updateTable('app_settings').set({ value: payload, updatedAt: ts() } as never).where('key', '=', key).execute();
  } else {
    await db.insertInto('app_settings').values({ key, value: payload, updatedAt: ts() }).execute();
  }
}

/* ================================== گزارش‌ها ================================== */

export async function logAudit(
  db: Db,
  input: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    meta?: Record<string, unknown>;
    ip?: string;
  },
): Promise<void> {
  await db
    .insertInto('audit_logs')
    .values({
      id: id(),
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      meta: input.meta ? stringifyJson(input.meta) : null,
      ip: input.ip ?? '',
      createdAt: ts(),
    })
    .execute();
}
