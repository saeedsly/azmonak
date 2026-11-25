import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** ریشه‌ی پروژه (پوشه‌ی server) */
export const serverRoot = path.resolve(here, '..');
/** ریشه‌ی مخزن */
export const repoRoot = path.resolve(serverRoot, '..');

/*
 * فایل‌های تنظیمات از دو محل خوانده می‌شوند (اولویت با server/.env):
 *   ۱) server/.env
 *   ۲) .env  (ریشه‌ی مخزن)
 * بنابراین برنامه هم از ریشه و هم از داخل پوشه‌ی server قابل اجراست.
 */
dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });
dotenv.config({ path: path.join(repoRoot, '.env'), quiet: true });

function envStr(key: string, fallback = ''): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

const nodeEnv = envStr('NODE_ENV', 'development');
const dataDir = path.resolve(serverRoot, envStr('DATA_DIR', './data'));
const uploadDir = path.resolve(serverRoot, envStr('UPLOAD_DIR', path.join(dataDir, 'uploads')));

export type DbMode = 'mysql' | 'sqlite';
export type AiProvider = 'anthropic' | 'openai' | 'ollama' | 'none';

const dbMode = (envStr('DB_MODE', 'sqlite').toLowerCase() === 'mysql' ? 'mysql' : 'sqlite') as DbMode;

function resolveFromServer(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(serverRoot, p);
}

export const config = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: envInt('PORT', 4000),
  host: envStr('HOST', '0.0.0.0'),

  appName: envStr('APP_NAME', 'ازمونک'),
  appUrl: envStr('APP_URL', `http://localhost:${envInt('PORT', 4000)}`),

  sessionSecret: envStr('SESSION_SECRET', 'azmoonak-dev-secret-change-me'),
  sessionTtlHours: envInt('SESSION_TTL_HOURS', 12),

  db: {
    mode: dbMode,
    mysqlUrl: envStr('MYSQL_URL', 'mysql://root:root@127.0.0.1:3306/azmoonak'),
    sqliteFile: resolveFromServer(envStr('SQLITE_FILE', path.join(dataDir, 'azmoonak.db'))),
    poolSize: envInt('DB_POOL_SIZE', 10),
  },

  ai: {
    provider: envStr('AI_PROVIDER', 'anthropic').toLowerCase() as AiProvider,
    anthropic: {
      apiKey: envStr('ANTHROPIC_API_KEY', ''),
      baseUrl: envStr('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
      model: envStr('ANTHROPIC_MODEL', 'claude-sonnet-4-5'),
      maxTokens: envInt('ANTHROPIC_MAX_TOKENS', 8000),
    },
    openai: {
      apiKey: envStr('OPENAI_API_KEY', ''),
      baseUrl: envStr('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      model: envStr('OPENAI_MODEL', 'gpt-4o-mini'),
      maxTokens: envInt('OPENAI_MAX_TOKENS', 8000),
    },
    ollama: {
      baseUrl: envStr('OLLAMA_BASE_URL', 'http://127.0.0.1:11434'),
      model: envStr('OLLAMA_MODEL', 'llama3.2-vision'),
      maxTokens: envInt('OLLAMA_MAX_TOKENS', 8000),
    },
    requestTimeoutMs: envInt('AI_TIMEOUT_MS', 120000),
  },

  storage: {
    dataDir,
    uploadDir,
    maxUploadMb: envInt('MAX_UPLOAD_MB', 25),
    publicDir: path.resolve(repoRoot, envStr('WEB_DIST_DIR', 'web/dist')),
  },

  seedOnStart: envBool('SEED_ON_START', false),
  corsOrigins: envStr('CORS_ORIGINS', '*'),
  trustProxy: envBool('TRUST_PROXY', false),
} as const;

export function ensureRuntimeDirs(): void {
  fs.mkdirSync(config.storage.dataDir, { recursive: true });
  fs.mkdirSync(config.storage.uploadDir, { recursive: true });
  if (config.db.mode === 'sqlite') {
    fs.mkdirSync(path.dirname(config.db.sqliteFile), { recursive: true });
  }
}

export type AppConfig = typeof config;
