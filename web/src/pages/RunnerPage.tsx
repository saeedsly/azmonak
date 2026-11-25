import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { PublicQuestionDto } from '@azmoonak/shared';
import { api, ApiError } from '../lib/api';
import { Button, ErrorState, Loading, Modal } from '../components/ui';
import { QuestionInput } from '../components/QuestionInput';
import { faDuration, faNumber } from '../lib/format';

interface AttemptState {
  attempt: {
    id: string;
    status: string;
    startedAt: number;
    expiresAt: number | null;
    submittedAt: number | null;
    participantName: string;
  };
  exam: {
    id: string;
    title: string;
    type: string;
    durationMinutes: number;
    showResultImmediately: boolean;
  };
  questions: PublicQuestionDto[];
  answers: Array<{ questionId: string; value: unknown }>;
  serverTime: number;
}

export function RunnerPage() {
  const { attemptId = '' } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState<AttemptState | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const offsetRef = useRef(0);
  const submittedRef = useRef(false);

  const token = useMemo(
    () => sessionStorage.getItem(`azmoonak.attempt.${attemptId}`),
    [attemptId],
  );

  const load = useCallback(async () => {
    try {
      const data = await api.get<AttemptState>(`/public/attempts/${attemptId}`, {
        headers: token ? { 'X-Attempt-Token': token } : {},
      });
      offsetRef.current = data.serverTime - Date.now();
      setState(data);
      const map: Record<string, unknown> = {};
      for (const answer of data.answers) map[answer.questionId] = answer.value;
      setAnswers(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'دریافت سوال‌ها ممکن نشد.');
    } finally {
      setLoading(false);
    }
  }, [attemptId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  /* تایمر */
  useEffect(() => {
    if (!state?.attempt.expiresAt) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Date.now() + offsetRef.current;
      const left = Math.max(0, Math.round((state.attempt.expiresAt! - now) / 1000));
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) {
        submittedRef.current = true;
        void submit(true);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.attempt.expiresAt]);

  const saveAnswer = useCallback(
    async (questionId: string, value: unknown) => {
      setAnswers((current) => ({ ...current, [questionId]: value }));
      setSaving(true);
      try {
        await api.put(
          `/public/attempts/${attemptId}/answers/${questionId}`,
          { value },
          { headers: token ? { 'X-Attempt-Token': token } : {} },
        );
        setSavedAt(Date.now());
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) {
          setError('زمان آزمون به پایان رسیده است.');
        }
      } finally {
        setSaving(false);
      }
    },
    [attemptId, token],
  );

  const submit = useCallback(
    async (auto = false) => {
      try {
        await api.post(
          `/public/attempts/${attemptId}/submit`,
          { autoSubmit: auto },
          { headers: token ? { 'X-Attempt-Token': token } : {} },
        );
        submittedRef.current = true;
        navigate(`/result/${attemptId}`);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'ثبت پاسخ‌ها ممکن نشد.');
      }
    },
    [attemptId, navigate, token],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const result = await api.upload<{ url: string }>(
          `/public/attempts/${attemptId}/upload`,
          formData,
        );
        return result.url;
      } catch {
        setError('بارگذاری فایل ناموفق بود.');
        return null;
      }
    },
    [attemptId],
  );

  if (loading) return <Loading label="در حال آماده‌سازی آزمون…" />;
  if (error && !state) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16">
        <ErrorState message={error} onRetry={() => void load()} />
      </div>
    );
  }
  if (!state) return null;

  const questions = state.questions;
  const question = questions[current];
  const answeredCount = Object.values(answers).filter(
    (value) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && !value.length),
  ).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <header className="card sticky top-3 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-ink-900">{state.exam.title}</h1>
          <p className="mt-0.5 text-[11px] text-ink-500">
            سوال {faNumber(current + 1)} از {faNumber(questions.length)} • پاسخ داده‌شده:{' '}
            {faNumber(answeredCount)}
            {saving ? ' • در حال ذخیره…' : savedAt ? ' • ذخیره شد ✓' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {remaining !== null ? (
            <div
              className={`rounded-xl px-3 py-2 text-center text-sm font-extrabold tabular-nums ${
                remaining < 300 ? 'bg-rose-50 text-rose-700' : 'bg-brand-50 text-brand-700'
              }`}
            >
              <span className="block text-[10px] font-medium">زمان باقی‌مانده</span>
              {faDuration(remaining)}
            </div>
          ) : null}
          <Button variant="soft" onClick={() => setConfirm(true)}>
            پایان آزمون
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_240px]">
        <div className="order-2 lg:order-1">
          {question ? (
            <article className="card p-5">
              <header className="mb-4 flex items-start justify-between gap-3 border-b border-ink-100 pb-3">
                <div>
                  <span className="badge bg-brand-100 text-brand-700">
                    سوال {faNumber(current + 1)}
                  </span>
                  <span className="badge ms-2 bg-ink-100 text-ink-600">
                    {faNumber(question.points)} نمره
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setFlags((current) => ({
                      ...current,
                      [question.id]: !current[question.id],
                    }))
                  }
                  className={`btn-ghost text-xs ${flags[question.id] ? 'text-amber-600' : ''}`}
                >
                  {flags[question.id] ? '★ علامت‌گذاری شد' : '☆ علامت‌گذاری'}
                </button>
              </header>

              <h2 className="text-sm leading-8 font-medium whitespace-pre-line text-ink-800">
                {question.title}
              </h2>
              {question.description ? (
                <p className="mt-2 text-xs leading-7 text-ink-500">{question.description}</p>
              ) : null}
              {question.imageUrl ? (
                <img
                  src={question.imageUrl}
                  alt=""
                  className="mt-3 max-h-96 rounded-xl border border-ink-200 object-contain"
                />
              ) : null}

              <div className="mt-5">
                <QuestionInput
                  question={question}
                  value={answers[question.id] ?? null}
                  onChange={(value) => void saveAnswer(question.id, value)}
                  onUpload={uploadFile}
                />
              </div>

              <footer className="mt-6 flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
                <Button
                  variant="soft"
                  disabled={current === 0}
                  onClick={() => setCurrent((value) => Math.max(0, value - 1))}
                >
                  سوال قبلی
                </Button>
                {current < questions.length - 1 ? (
                  <Button onClick={() => setCurrent((value) => Math.min(questions.length - 1, value + 1))}>
                    سوال بعدی
                  </Button>
                ) : (
                  <Button onClick={() => setConfirm(true)}>پایان و ثبت پاسخ‌ها</Button>
                )}
              </footer>
            </article>
          ) : null}
        </div>

        <aside className="order-1 lg:order-2">
          <div className="card sticky top-24 p-4">
            <p className="mb-3 text-xs font-bold text-ink-700">سوال‌ها</p>
            <div className="grid grid-cols-6 gap-1.5 lg:grid-cols-5">
              {questions.map((item, index) => {
                const hasValue = answers[item.id] !== undefined && answers[item.id] !== null && answers[item.id] !== '';
                const active = index === current;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrent(index)}
                    className={`relative h-9 rounded-lg text-xs font-bold transition ${
                      active
                        ? 'bg-brand-600 text-white'
                        : hasValue
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-ink-100 text-ink-500 hover:bg-ink-200'
                    }`}
                  >
                    {faNumber(index + 1)}
                    {flags[item.id] ? (
                      <span className="absolute -top-1 -left-1 text-[10px] text-amber-500">★</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1.5 text-[11px] text-ink-500">
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-100" /> پاسخ داده شده
              </p>
              <p className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-ink-200" /> بی‌پاسخ
              </p>
            </div>
          </div>
        </aside>
      </div>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="پایان آزمون"
        footer={
          <>
            <Button variant="soft" onClick={() => setConfirm(false)}>
              بازگشت به آزمون
            </Button>
            <Button onClick={() => void submit(false)}>ثبت نهایی پاسخ‌ها</Button>
          </>
        }
      >
        <p className="text-sm leading-8 text-ink-600">
          مطمئن هستید که می‌خواهید آزمون را به پایان برسانید؟ پس از ثبت نهایی، امکان تغییر پاسخ‌ها
          وجود ندارد.
        </p>
        <div className="mt-4 rounded-xl bg-ink-50 p-4 text-xs text-ink-600">
          تعداد سوال‌های بی‌پاسخ: <b>{faNumber(questions.length - answeredCount)}</b> از{' '}
          {faNumber(questions.length)}
        </div>
      </Modal>
    </div>
  );
}
