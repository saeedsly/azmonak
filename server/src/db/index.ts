import { Kysely, MysqlDialect, SqliteDialect } from 'kysely';
import { config } from '../config.js';
import type { Database } from './types.js';

let instance: Kysely<Database> | null = null;

/**
 * بارگذاری درایور SQLite به‌صورت lazy.
 * این بسته اختیاری است و روی بعضی سیستم‌ها (ویندوز بدون ابزار کامپایل) نصب نمی‌شود؛
 * در آن حالت پیام خطای فارسی و راه‌حل روشن به کاربر نشان داده می‌شود.
 */
async function loadBetterSqlite3(): Promise<typeof import('better-sqlite3')> {
  try {
    const mod = await import('better-sqlite3');
    return (mod as unknown as { default: typeof import('better-sqlite3') }).default;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      [
        'بسته‌ی better-sqlite3 روی این سیستم نصب نشده است، بنابراین حالت SQLite قابل استفاده نیست.',
        `جزئیات فنی: ${detail}`,
        '',
        'یکی از این دو راه را انتخاب کنید:',
        '۱) نصب دوباره با دستور زیر (اگر خطا داد، ابزار Build Tools ویندوز را نصب کنید):',
        '     npm install better-sqlite3',
        '۲) استفاده از MySQL (توصیه‌شده برای محیط XAMPP): در فایل .env مقدار DB_MODE=mysql قرار دهید.',
      ].join('\n'),
    );
  }
}

async function createKysely(): Promise<Kysely<Database>> {
  if (config.db.mode === 'sqlite') {
    const BetterSqlite3 = await loadBetterSqlite3();
    const database = new BetterSqlite3(config.db.sqliteFile);
    database.pragma('journal_mode = WAL');
    database.pragma('foreign_keys = ON');
    return new Kysely<Database>({
      dialect: new SqliteDialect({ database }),
    });
  }

  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    uri: config.db.mysqlUrl,
    connectionLimit: config.db.poolSize,
    charset: 'utf8mb4_general_ci',
    timezone: 'Z',
    supportBigNumbers: true,
  });
  return new Kysely<Database>({
    dialect: new MysqlDialect({ pool }),
  });
}

export async function getDb(): Promise<Kysely<Database>> {
  if (!instance) {
    instance = await createKysely();
  }
  return instance;
}

export async function closeDb(): Promise<void> {
  if (instance) {
    await instance.destroy();
    instance = null;
  }
}

export function nowMs(): number {
  return Date.now();
}

export function newId(): string {
  return crypto.randomUUID();
}
