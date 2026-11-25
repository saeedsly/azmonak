import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Button, Card, ErrorState, Input, Label, Loading } from '../components/ui';
import { faNumber } from '../lib/format';

interface ExamInfo {
  id: string;
  title: string;
  description: string;
  instructions: string;
  type: string;
  durationMinutes: number;
  questionCount: number;
  totalPoints: number;
  passScore: number;
  requires: { name: boolean; email: boolean; phone: boolean; nationalCode: boolean };
  allowAnonymous: boolean;
}

const ATTEMPT_TOKEN_KEY = 'azmoonak.attempt.token';

export function AccessPage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', nationalCode: '' });
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .post<{ exam: ExamInfo }>('/public/resolve', { code })
      .then((data) => {
        if (!cancelled) setExam(data.exam);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'خطا در دریافت اطلاعات آزمون.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    if (!exam) return;
    setStarting(true);
    setError('');
    try {
      const data = await api.post<{ attemptId: string; token: string }>('/public/attempts', {
        accessCode: code,
        ...form,
      });
      sessionStorage.setItem(ATTEMPT_TOKEN_KEY, data.token);
      sessionStorage.setItem(`azmoonak.attempt.${data.attemptId}`, data.token);
      navigate(`/run/${data.attemptId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'شروع آزمون ممکن نشد.');
      setStarting(false);
    }
  };

  if (loading) return <Loading label="در حال بررسی کلید دسترسی…" />;
  if (error && !exam) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-brand-600 hover:underline">
            بازگشت به صفحه‌ی اصلی
          </Link>
        </div>
      </div>
    );
  }
  if (!exam) return null;

  const isSurvey = exam.type === 'SURVEY' || exam.type === 'POLL';

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Card
        title={exam.title}
        description={exam.description}
        actions={
          <span className="badge bg-brand-100 text-brand-700">
            {isSurvey ? 'نظرسنجی' : 'آزمون'}
          </span>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Info label="تعداد سوال" value={faNumber(exam.questionCount)} />
          <Info
            label="مدت آزمون"
            value={exam.durationMinutes > 0 ? `${faNumber(exam.durationMinutes)} دقیقه` : 'بدون محدودیت'}
          />
          <Info
            label={isSurvey ? 'نوع' : 'نمره قبولی'}
            value={isSurvey ? 'نظرسنجی' : `${faNumber(exam.passScore)}٪`}
          />
        </div>

        {exam.instructions ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-4">
            <p className="mb-1 text-xs font-bold text-amber-800">راهنمای شرکت در آزمون</p>
            <p className="text-xs leading-7 whitespace-pre-line text-amber-900/80">
              {exam.instructions}
            </p>
          </div>
        ) : null}

        <form onSubmit={start} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {exam.requires.name || (!isSurvey && exam.allowAnonymous) ? (
              <div>
                <Label hint={exam.requires.name ? '(اجباری)' : '(اختیاری)'}>نام و نام خانوادگی</Label>
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="مثلاً رضا محمدی"
                />
              </div>
            ) : null}

            {exam.requires.nationalCode ? (
              <div>
                <Label hint="(اجباری)">کد ملی</Label>
                <Input
                  value={form.nationalCode}
                  onChange={(event) => setForm({ ...form, nationalCode: event.target.value })}
                  inputMode="numeric"
                  dir="ltr"
                  className="text-right"
                />
              </div>
            ) : null}

            {exam.requires.email ? (
              <div>
                <Label hint="(اجباری)">ایمیل</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  dir="ltr"
                  className="text-right"
                />
              </div>
            ) : null}

            {exam.requires.phone ? (
              <div>
                <Label hint="(اجباری)">شماره تماس</Label>
                <Input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  dir="ltr"
                  className="text-right"
                  inputMode="tel"
                />
              </div>
            ) : null}
          </div>

          {exam.allowAnonymous && isSurvey ? (
            <p className="text-[11px] text-ink-500">
              این نظرسنجی ناشناس است؛ می‌توانید بدون وارد کردن مشخصات شرکت کنید.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={starting}>
            {starting ? 'در حال شروع…' : isSurvey ? 'شرکت در نظرسنجی' : 'شروع آزمون'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50/80 px-4 py-3">
      <p className="text-[11px] text-ink-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink-800">{value}</p>
    </div>
  );
}
