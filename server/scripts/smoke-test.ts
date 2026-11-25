/**
 * تست سریع API ازمونک (بدون نیاز به ابزار جانبی).
 * اجرا:  npx tsx server/scripts/smoke-test.ts
 */
const BASE = process.env.BASE ?? 'http://127.0.0.1:4000';

let failures = 0;

function check(label: string, condition: boolean, extra?: unknown): void {
  if (condition) {
    console.log(`  ✅ ${label}`);
  } else {
    failures += 1;
    console.log(`  ❌ ${label}`, extra ?? '');
  }
}

async function json<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body: body as T };
}

async function main(): Promise<void> {
  console.log(`\nتست API ازمونک روی ${BASE}\n`);

  console.log('۱) سلامت سرویس');
  const health = await json<{ ok: boolean; db: string }>('/api/health');
  check('سرویس پاسخ می‌دهد', health.status === 200 && health.body.ok === true, health.body);
  console.log(`     دیتابیس: ${health.body.db}`);

  console.log('\n۲) ورود مدیر');
  const login = await json<{ token?: string; error?: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'Admin@1234' }),
  });
  check('ورود موفق', !!login.body.token, login.body.error);
  if (!login.body.token) {
    console.log('\n(برای ادامه، کاربر admin با رمز Admin@1234 لازم است)');
    process.exit(1);
  }
  const auth = { Authorization: `Bearer ${login.body.token}` };

  console.log('\n۳) داده‌های مدیریتی');
  const exams = await json<{ items: Array<{ id: string; accessCode: string; type: string; title: string }> }>(
    '/api/admin/exams',
    { headers: auth },
  );
  check('فهرست آزمون‌ها دریافت شد', exams.status === 200 && exams.body.items.length > 0);
  const exam = exams.body.items.find((item) => item.type === 'EXAM');
  check('حداقل یک آزمون نمونه وجود دارد', !!exam);

  const overview = await json<{ totals: { exams: number } }>('/api/admin/overview', { headers: auth });
  check('داشبورد آماری پاسخ داد', overview.status === 200);

  if (!exam) process.exit(1);

  console.log('\n۴) جریان فراگیر');
  const resolve = await json<{ exam: { questionCount: number; title: string } }>('/api/public/resolve', {
    method: 'POST',
    body: JSON.stringify({ code: exam.accessCode }),
  });
  check('کد دسترسی معتبر است', resolve.status === 200 && resolve.body.exam.questionCount > 0, resolve.body);

  const badResolve = await json<{ error?: string }>('/api/public/resolve', {
    method: 'POST',
    body: JSON.stringify({ code: 'WRONG-CODE' }),
  });
  check('کد نامعتبر رد می‌شود', badResolve.status === 404);

  const start = await json<{ attemptId?: string; token?: string; error?: string }>('/api/public/attempts', {
    method: 'POST',
    body: JSON.stringify({
      accessCode: exam.accessCode,
      name: 'کاربر تست',
      email: 'test@example.com',
      nationalCode: '0012345678',
    }),
  });
  check('شروع آزمون انجام شد', !!start.body.attemptId, start.body.error);
  if (!start.body.attemptId || !start.body.token) process.exit(1);

  const attemptHeaders = { 'X-Attempt-Token': start.body.token };
  const state = await json<{ questions: Array<{ id: string; options: Array<{ id: string }> }> }>(
    `/api/public/attempts/${start.body.attemptId}`,
    { headers: attemptHeaders },
  );
  check('سوال‌ها برای فراگیر ارسال شد', state.status === 200 && state.body.questions.length > 0);

  const choice = state.body.questions.find((question) => question.options.length > 0);
  if (choice) {
    const saved = await json<{ ok?: boolean }>(
      `/api/public/attempts/${start.body.attemptId}/answers/${choice.id}`,
      {
        method: 'PUT',
        headers: attemptHeaders,
        body: JSON.stringify({ value: choice.options[0].id }),
      },
    );
    check('ذخیره‌ی پاسخ', saved.status === 200 && saved.body.ok === true);
  }

  const submit = await json<{ result?: { score: number; maxScore: number; status: string } }>(
    `/api/public/attempts/${start.body.attemptId}/submit`,
    { method: 'POST', headers: attemptHeaders },
  );
  check('ثبت نهایی پاسخ‌ها', submit.status === 200 && !!submit.body.result, submit.body);
  if (submit.body.result) {
    console.log(
      `     نمره: ${submit.body.result.score} از ${submit.body.result.maxScore} (${submit.body.result.status})`,
    );
  }

  console.log('\n۵) تحلیل و خروجی');
  const analytics = await json<{ totals: { attempts: number } }>(
    `/api/admin/results/exams/${exam.id}/analytics`,
    { headers: auth },
  );
  check('گزارش تحلیلی ساخته شد', analytics.status === 200);

  const csv = await fetch(`${BASE}/api/admin/results/exams/${exam.id}/export.csv`, { headers: auth });
  const csvText = await csv.text();
  check('خروجی CSV ساخته شد', csv.status === 200 && csvText.includes('نام فراگیر'));

  console.log('\n۶) هوش مصنوعی');
  const ai = await json<{ provider: string; demo: boolean; message: string }>('/api/admin/ai/status', {
    headers: auth,
  });
  check('وضعیت سرویس هوش مصنوعی', ai.status === 200);
  console.log(`     ${ai.body.message}`);

  console.log(
    failures === 0 ? '\n✅ همه‌ی تست‌ها با موفقیت انجام شد.\n' : `\n❌ ${failures} تست ناموفق بود.\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('خطا در اجرای تست:', error);
  process.exit(1);
});
