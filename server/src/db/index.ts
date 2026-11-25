import { Kysely, MysqlDialect, SqliteDialect } from 'kysely';
import { config } from '../config.js';
import type { Database } from './types.js';

let instance: Kysely<Database> | null = null;

async function createKysely(): Promise<Kysely<Database>> {
  if (config.db.mode === 'sqlite') {
    const { default: BetterSqlite3 } = await import('better-sqlite3');
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
