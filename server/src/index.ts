import { createApp } from './app.js';
import { config, ensureRuntimeDirs } from './config.js';
import { closeDb, getDb } from './db/index.js';
import { runMigrations } from './db/migrations.js';
import { seed } from './db/seed.js';
import { startSweeper, stopSweeper } from './services/sweeper.js';

async function main(): Promise<void> {
  ensureRuntimeDirs();

  const db = await getDb();
  const applied = await runMigrations(db);
  if (applied.length) {
    console.log(`🗄  مهاجرت‌های دیتابیس اجرا شد: ${applied.join(', ')}`);
  }

  if (config.seedOnStart) {
    await seed(db);
  }

  const app = createApp();
  startSweeper();
  const server = app.listen(config.port, config.host, () => {
    const shown = config.host === '0.0.0.0' ? 'localhost' : config.host;
    console.log('');
    console.log(`  ${config.appName} روی http://${shown}:${config.port} در حال اجراست`);
    console.log(`  پنل مدیریت : http://${shown}:${config.port}/admin`);
    console.log(`  ورود فراگیر: http://${shown}:${config.port}/`);
    console.log(`  دیتابیس    : ${config.db.mode}`);
    console.log('');
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} دریافت شد؛ خاموش شدن سرور...`);
    stopSweeper();
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('❌ راه‌اندازی سرور ناموفق بود:', error);
  process.exit(1);
});
