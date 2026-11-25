import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { useBranding } from '../lib/settings';
import { Button, Input, Loading } from '../components/ui';

interface ResolvedExam {
  id: string;
  title: string;
  type: string;
  questionCount: number;
  durationMinutes: number;
}

const FEATURES = [
  {
    icon: '🔑',
    title: 'ورود با کلید آزمون',
    text: 'فراگیر با یک کد دسترسی یا کد اختصاصی وارد می‌شود؛ نیازی به ساخت حساب کاربری نیست.',
  },
  {
    icon: '⏱️',
    title: 'زمان‌بندی و ذخیره خودکار',
    text: 'زمان آزمون به‌صورت خودکار کنترل و در پایان زمان، پاسخ‌ها به‌صورت خودکار ارسال می‌شود.',
  },
  {
    icon: '🤖',
    title: 'هوش مصنوعی در ورود اطلاعات',
    text: 'عکس یا PDF برگه‌ی آزمون را بدهید؛ سوال‌ها، گزینه‌ها و پاسخ‌ها خودکار استخراج می‌شوند.',
  },
  {
    icon: '📊',
    title: 'تحلیل و داوری',
    text: 'نمره‌ی هر سوال، ضریب دشواری، تحلیل گزینه‌ها و داوری دستی پاسخ‌های تشریحی.',
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const branding = useBranding();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = code.trim();
    if (!value) {
      setError('کد دسترسی را وارد کنید.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.post<{ exam: ResolvedExam }>('/public/resolve', { code: value });
      navigate(`/access/${encodeURIComponent(value.toUpperCase())}`, {
        state: { exam: data.exam },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'خطا در بررسی کد رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <section className="animate-fade-up text-center">
        <span className="badge bg-brand-100 text-brand-700">پرسش‌نامه و آزمون آنلاین</span>
        <h1 className="mt-4 text-3xl font-black leading-tight text-ink-900 sm:text-4xl">
          {branding.appName}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-ink-500">
          {branding.tagline} — کلید آزمون خود را وارد کنید و بدون نیاز به نصب هیچ برنامه‌ای، در
          آزمون شرکت کنید.
        </p>
      </section>

      <section className="card animate-fade-up mx-auto mt-8 max-w-xl p-6">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="access-code">
              کلید دسترسی آزمون
            </label>
            <Input
              id="access-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="مثلاً AZM-7K2Q9"
              autoComplete="off"
              dir="ltr"
              className="text-center font-mono text-lg tracking-[0.35em]"
            />
            <p className="mt-2 text-[11px] text-ink-400">
              کد را می‌توانید از مدرس یا مدیر آزمون دریافت کنید. حروف و اعداد را بدون فاصله وارد
              کنید.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'در حال بررسی…' : 'ورود به آزمون'}
          </Button>
        </form>
      </section>

      <section className="mt-10 grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="card p-5">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-xl">
              {feature.icon}
            </div>
            <h3 className="mt-3 text-sm font-bold text-ink-900">{feature.title}</h3>
            <p className="mt-1.5 text-xs leading-6 text-ink-500">{feature.text}</p>
          </article>
        ))}
      </section>

      {loading ? <Loading /> : null}
    </div>
  );
}
