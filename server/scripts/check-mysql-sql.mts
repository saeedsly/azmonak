/**
 * ابزار توسعه: SQL تولیدشده برای MySQL را بدون نیاز به سرور MySQL نشان می‌دهد.
 * اجرا:  npx tsx scripts/check-mysql-sql.mts
 */
import { Kysely, MysqlDialect } from 'kysely';
import { migrations } from '../src/db/migrations.js';
import type { Database } from '../src/db/types.js';

const captured: string[] = [];

const fakeConnection = {
  query(sql: string, _parameters: unknown[], callback: (err: unknown, result: unknown) => void) {
    captured.push(sql);
    callback(null, [{ affectedRows: 0, insertId: 0 }, []]);
  },
  release() {
    /* noop */
  },
};

const fakePool = {
  getConnection(callback: (err: unknown, connection: unknown) => void) {
    callback(null, fakeConnection);
  },
  end(callback: (err: unknown) => void) {
    callback(null);
  },
};

const db = new Kysely<Database>({
  dialect: new MysqlDialect({ pool: fakePool as never }),
});

for (const migration of migrations) {
  await migration.up(db);
}

console.log('===== DDL (MySQL) =====');
for (const sql of captured) console.log(`${sql}\n`);

/* --------- کوئری‌های اصلی فقط کامپایل می‌شوند --------- */

const listExams = db
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
  .orderBy('exams.createdAt', 'desc')
  .limit(50)
  .offset(0)
  .compile();

const listCourses = db
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
  .orderBy('courses.createdAt', 'desc')
  .compile();

const topExams = db
  .selectFrom('exams')
  .leftJoin('attempts', 'attempts.examId', 'exams.id')
  .selectAll('exams')
  .select((eb) => eb.fn.count<number>('attempts.id').as('attemptCount'))
  .groupBy('exams.id')
  .orderBy('attemptCount', 'desc')
  .compile();

const answersIn = db
  .selectFrom('answers')
  .selectAll()
  .where('attemptId', 'in', ['a', 'b'])
  .compile();

const identityCount = db
  .selectFrom('attempts')
  .select((eb) => eb.fn.countAll<number>().as('c'))
  .where('examId', '=', 'x')
  .where('status', '!=', 'IN_PROGRESS')
  .where('participantEmail', '=', 'a@b.c')
  .compile();

console.log('===== QUERY (MySQL) =====');
console.log(listExams.sql, '\n');
console.log(listCourses.sql, '\n');
console.log(topExams.sql, '\n');
console.log(answersIn.sql, '\n');
console.log(identityCount.sql, '\n');

process.exit(0);
