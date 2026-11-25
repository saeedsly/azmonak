import type { Kysely } from 'kysely';
import type { Database } from '../db/types.js';
import { getDb } from '../db/index.js';
import { finalizeAttempt } from './attemptService.js';
import { config } from '../config.js';

/**
 * پاکسازی دوره‌ای: آزمون‌هایی که زمانشان تمام شده ولی فراگیر پاسخ را ارسال نکرده
 * به‌صورت خودکار ثبت و تصحیح می‌شوند.
 */
export async function sweepExpiredAttempts(db: Kysely<Database>): Promise<number> {
  const expired = await db
    .selectFrom('attempts')
    .select('id')
    .where('status', '=', 'IN_PROGRESS')
    .where('expiresAt', '<', Date.now())
    .execute();

  for (const attempt of expired) {
    try {
      await finalizeAttempt(db, attempt.id, { note: 'ارسال خودکار به دلیل پایان زمان' });
    } catch (error) {
      console.error('[azmoonak] sweep failed for attempt', attempt.id, error);
    }
  }

  return expired.length;
}

let timer: NodeJS.Timeout | null = null;

export function startSweeper(intervalMs = 60_000): void {
  if (timer) return;
  timer = setInterval(() => {
    void (async () => {
      try {
        const db = await getDb();
        const count = await sweepExpiredAttempts(db);
        if (count > 0) console.log(`⏱  ${count} آزمون منقضی به‌صورت خودکار ثبت شد.`);
      } catch (error) {
        console.error('[azmoonak] sweeper error:', error);
      }
    })();
  }, intervalMs);
  timer.unref?.();
}

export function stopSweeper(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export const sweeperEnabled = config.nodeEnv !== 'test';
