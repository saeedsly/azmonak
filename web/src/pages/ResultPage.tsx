import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import { Button, Card, ErrorState, Loading } from '../components/ui';
import { faDate, faNumber } from '../lib/format';

interface ResultQuestion {
  id: string;
  orderIndex: number;
  type: string;
  title: string;
  points: number;
  yourAnswer: unknown;
  correctAnswer: unknown;
  isCorrect: boolean | null;
  pointsAwarded: number;
  maxPoints: number;
  explanation: string;
  feedback: string;
}

interface ResultPayload {
  attemptId: string;
  examTitle: string;
  type: string;
  status: string;
  submittedAt: number | null;
  durationUsedSec: number | null;
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean | null;
  showDetails: boolean;
  pendingManualGrading: boolean;
  questions: ResultQuestion[];
}

export function ResultPage() {
  const { attemptId = '' } = useParams();
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = sessionStorage.getItem(`azmoonak.attempt.${attemptId}`);

  useEffect(() => {
    api
      .get<{ result: ResultPayload }>(`/public/attempts/${attemptId}/result`, {
        headers: token ? { 'X-Attempt-Token': token } : {},
      })
      .then((data) => setResult(data.result))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'دریافت نتیجه ممکن نشد.'))
      .finally(() => setLoading(false));
  }, [attemptId, token]);

  if (loading) return <Loading label="در حال محاسبه نتیجه…" />;
  if (error || !result) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState message={error || 'نتیجه‌ای یافت نشد.'} />
      </div>
    );
  }

  const isSurvey = result.type === 'SURVEY' || result.type === 'POLL';
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, result.percent / 100)));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <Card className="text-center">
        {isSurvey ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-3xl">
              ✅
            </div>
            <h1 className="mt-4 text-lg font-extrabold text-ink-900">پاسخ شما ثبت شد</h1>
            <p className="mt-2 text-sm leading-8 text-ink-500">
              از مشارکت شما در «{result.examTitle}» سپاسگزاریم. نتایج نظرسنجی در اختیار مدیر آزمون
              قرار می‌گیرد.
            </p>
          </>
        ) : (
          <>
            <p className="text-xs text-ink-500">نمره‌ی شما در «{result.examTitle}»</p>
            <div className="relative mx-auto mt-4 h-40 w-40">
              <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="14" />
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={result.passed === false ? '#e11d48' : '#10b981'}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <p className="text-3xl font-black text-ink-900">{faNumber(result.percent)}٪</p>
                  <p className="text-[11px] text-ink-500">
                    {faNumber(result.score)} از {faNumber(result.maxScore)}
                  </p>
                </div>
              </div>
            </div>
            {result.passed !== null ? (
              <span
                className={`badge mt-4 ${
                  result.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {result.passed ? 'قبول شدید 🎉' : 'مردود شدید'}
              </span>
            ) : null}
            {result.pendingManualGrading ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
                بخشی از پاسخ‌های تشریحی در انتظار داوری است؛ نمره‌ی نهایی پس از بررسی اعلام می‌شود.
              </p>
            ) : null}
          </>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="soft" onClick={() => window.print()}>
            چاپ نتیجه
          </Button>
          <Link to="/" className="btn-soft">
            بازگشت به صفحه‌ی اصلی
          </Link>
        </div>
        {result.submittedAt ? (
          <p className="mt-3 text-[11px] text-ink-400">
            زمان ثبت پاسخ‌ها: {faDate(result.submittedAt)}
          </p>
        ) : null}
      </Card>

      {result.showDetails && result.questions.length ? (
        <Card className="mt-4" title="بررسی پاسخ‌ها">
          <div className="space-y-3">
            {result.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-xl border border-ink-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-7 font-medium text-ink-800">
                    {faNumber(index + 1)}. {question.title}
                  </p>
                  <span
                    className={`badge shrink-0 ${
                      question.isCorrect === true
                        ? 'bg-emerald-50 text-emerald-700'
                        : question.isCorrect === false
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-ink-100 text-ink-500'
                    }`}
                  >
                    {question.isCorrect === true
                      ? 'درست'
                      : question.isCorrect === false
                        ? 'نادرست'
                        : 'بدون نمره'}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-ink-500">
                  نمره: {faNumber(question.pointsAwarded)} از {faNumber(question.maxPoints)}
                </p>
                {question.explanation ? (
                  <p className="mt-2 rounded-lg bg-brand-50/70 p-3 text-xs leading-7 text-brand-900">
                    {question.explanation}
                  </p>
                ) : null}
                {question.feedback ? (
                  <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs leading-7 text-amber-900">
                    بازخورد داور: {question.feedback}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
