import type { Kysely } from 'kysely';
import type { Database } from './types.js';

export interface Migration {
  name: string;
  up: (db: Kysely<Database>) => Promise<void>;
}

const ts = (c: any) => c.notNull();

export const migrations: Migration[] = [
  {
    name: '001_init',
    up: async (db) => {
      await db.schema
        .createTable('users')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('username', 'varchar(191)', (c) => ts(c).unique())
        .addColumn('email', 'varchar(191)', (c) => c)
        .addColumn('passwordHash', 'varchar(191)', (c) => ts(c))
        .addColumn('fullName', 'varchar(191)', (c) => ts(c))
        .addColumn('role', 'varchar(32)', (c) => ts(c).defaultTo('EDITOR'))
        .addColumn('isActive', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('lastLoginAt', 'bigint', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('courses')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('title', 'varchar(191)', (c) => ts(c))
        .addColumn('description', 'text', (c) => c)
        .addColumn('code', 'varchar(191)', (c) => c)
        .addColumn('instructor', 'varchar(191)', (c) => c)
        .addColumn('color', 'varchar(32)', (c) => c)
        .addColumn('isArchived', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('createdBy', 'varchar(191)', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('exams')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('courseId', 'varchar(191)', (c) =>
          c.references('courses.id').onDelete('set null'),
        )
        .addColumn('title', 'varchar(191)', (c) => ts(c))
        .addColumn('description', 'text', (c) => c)
        .addColumn('instructions', 'text', (c) => c)
        .addColumn('type', 'varchar(32)', (c) => ts(c).defaultTo('EXAM'))
        .addColumn('status', 'varchar(32)', (c) => ts(c).defaultTo('DRAFT'))
        .addColumn('accessCode', 'varchar(191)', (c) => ts(c).unique())
        .addColumn('durationMinutes', 'integer', (c) => ts(c).defaultTo(45))
        .addColumn('maxAttempts', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('shuffleQuestions', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('shuffleOptions', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('showResultImmediately', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('showCorrectAnswers', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('showPerQuestionFeedback', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('passScore', 'integer', (c) => ts(c).defaultTo(50))
        .addColumn('startAt', 'bigint', (c) => c)
        .addColumn('endAt', 'bigint', (c) => c)
        .addColumn('requireName', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('requireEmail', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('requirePhone', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('requireNationalCode', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('allowAnonymous', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('createdBy', 'varchar(191)', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('questions')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('examId', 'varchar(191)', (c) =>
          ts(c).references('exams.id').onDelete('cascade'),
        )
        .addColumn('orderIndex', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('type', 'varchar(32)', (c) => ts(c))
        .addColumn('title', 'text', (c) => ts(c))
        .addColumn('description', 'text', (c) => c)
        .addColumn('imageUrl', 'varchar(191)', (c) => c)
        .addColumn('points', 'integer', (c) => ts(c).defaultTo(100))
        .addColumn('explanation', 'text', (c) => c)
        .addColumn('difficulty', 'integer', (c) => ts(c).defaultTo(3))
        .addColumn('tags', 'text', (c) => c)
        .addColumn('isRequired', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('allowPartialCredit', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('options', 'text', (c) => c)
        .addColumn('matrixConfig', 'text', (c) => c)
        .addColumn('ratingConfig', 'text', (c) => c)
        .addColumn('source', 'varchar(32)', (c) => ts(c).defaultTo('MANUAL'))
        .addColumn('isApproved', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('aiMeta', 'text', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('participants')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('fullName', 'varchar(191)', (c) => ts(c))
        .addColumn('email', 'varchar(191)', (c) => c)
        .addColumn('phone', 'varchar(191)', (c) => c)
        .addColumn('nationalCode', 'varchar(191)', (c) => c)
        .addColumn('meta', 'text', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('attempts')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('examId', 'varchar(191)', (c) =>
          ts(c).references('exams.id').onDelete('cascade'),
        )
        .addColumn('participantId', 'varchar(191)', (c) => c)
        .addColumn('participantName', 'varchar(191)', (c) => c)
        .addColumn('participantEmail', 'varchar(191)', (c) => c)
        .addColumn('participantPhone', 'varchar(191)', (c) => c)
        .addColumn('participantNationalCode', 'varchar(191)', (c) => c)
        .addColumn('isAnonymous', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('status', 'varchar(32)', (c) => ts(c).defaultTo('IN_PROGRESS'))
        .addColumn('startedAt', 'bigint', (c) => ts(c))
        .addColumn('expiresAt', 'bigint', (c) => c)
        .addColumn('submittedAt', 'bigint', (c) => c)
        .addColumn('durationUsedSec', 'integer', (c) => c)
        .addColumn('score', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('maxScore', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('passed', 'integer', (c) => c)
        .addColumn('accessCodeUsed', 'varchar(191)', (c) => c)
        .addColumn('ip', 'varchar(191)', (c) => c)
        .addColumn('userAgent', 'varchar(191)', (c) => c)
        .addColumn('gradedBy', 'varchar(191)', (c) => c)
        .addColumn('gradedAt', 'bigint', (c) => c)
        .addColumn('gradingNotes', 'text', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('answers')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('attemptId', 'varchar(191)', (c) =>
          ts(c).references('attempts.id').onDelete('cascade'),
        )
        .addColumn('questionId', 'varchar(191)', (c) =>
          ts(c).references('questions.id').onDelete('cascade'),
        )
        .addColumn('value', 'text', (c) => c)
        .addColumn('isCorrect', 'integer', (c) => c)
        .addColumn('pointsAwarded', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('maxPoints', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('needsManualGrading', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('feedback', 'text', (c) => c)
        .addColumn('gradedBy', 'varchar(191)', (c) => c)
        .addColumn('gradedAt', 'bigint', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('invites')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('examId', 'varchar(191)', (c) =>
          ts(c).references('exams.id').onDelete('cascade'),
        )
        .addColumn('code', 'varchar(191)', (c) => ts(c).unique())
        .addColumn('label', 'varchar(191)', (c) => c)
        .addColumn('maxUses', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('usedCount', 'integer', (c) => ts(c).defaultTo(0))
        .addColumn('expiresAt', 'bigint', (c) => c)
        .addColumn('isActive', 'integer', (c) => ts(c).defaultTo(1))
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('ai_jobs')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('kind', 'varchar(64)', (c) => ts(c))
        .addColumn('status', 'varchar(32)', (c) => ts(c).defaultTo('PENDING'))
        .addColumn('inputMeta', 'text', (c) => c)
        .addColumn('result', 'text', (c) => c)
        .addColumn('error', 'text', (c) => c)
        .addColumn('createdBy', 'varchar(191)', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .addColumn('finishedAt', 'bigint', (c) => c)
        .execute();

      await db.schema
        .createTable('app_settings')
        .ifNotExists()
        .addColumn('key', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('value', 'text', (c) => c)
        .addColumn('updatedAt', 'bigint', (c) => ts(c))
        .execute();

      await db.schema
        .createTable('audit_logs')
        .ifNotExists()
        .addColumn('id', 'varchar(191)', (c) => c.primaryKey())
        .addColumn('userId', 'varchar(191)', (c) => c)
        .addColumn('action', 'varchar(64)', (c) => ts(c))
        .addColumn('entity', 'varchar(64)', (c) => c)
        .addColumn('entityId', 'varchar(191)', (c) => c)
        .addColumn('meta', 'text', (c) => c)
        .addColumn('ip', 'varchar(191)', (c) => c)
        .addColumn('createdAt', 'bigint', (c) => ts(c))
        .execute();

      /* ایندکس‌ها */
      await db.schema.createIndex('idx_exams_course').on('exams').column('courseId').execute();
      await db.schema.createIndex('idx_questions_exam').on('questions').column('examId').execute();
      await db.schema.createIndex('idx_attempts_exam').on('attempts').column('examId').execute();
      await db.schema.createIndex('idx_answers_attempt').on('answers').column('attemptId').execute();
      await db.schema.createIndex('idx_answers_question').on('answers').column('questionId').execute();
      await db.schema.createIndex('idx_invites_exam').on('invites').column('examId').execute();
      await db.schema.createIndex('idx_audit_created').on('audit_logs').column('createdAt').execute();
    },
  },
  {
    name: '002_participants_updated_at',
    up: async (db) => {
      /* برای نصب‌های قدیمی که جدول participants بدون ستون updatedAt ساخته شده بود */
      try {
        await db.schema
          .alterTable('participants')
          .addColumn('updatedAt', 'bigint', (c) => c.notNull().defaultTo(0))
          .execute();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const alreadyExists = /duplicate|already exists/i.test(message);
        if (!alreadyExists) throw error;
      }
    },
  },
];

export async function runMigrations(db: Kysely<Database>): Promise<string[]> {
  await db.schema
    .createTable('schema_migrations')
    .ifNotExists()
    .addColumn('name', 'varchar(191)', (c) => c.primaryKey())
    .addColumn('appliedAt', 'bigint', (c) => c.notNull())
    .execute();

  const appliedRows = await db.selectFrom('schema_migrations').select('name').execute();
  const applied = new Set(appliedRows.map((r) => r.name));
  const executed: string[] = [];

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue;
    await migration.up(db);
    await db
      .insertInto('schema_migrations')
      .values({ name: migration.name, appliedAt: Date.now() })
      .execute();
    executed.push(migration.name);
  }

  return executed;
}
