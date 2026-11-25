import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, getToken } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { Badge, Bar, Button, Card, EmptyState, Stat } from '../../../components/ui';
import { faDate, faNumber, percent } from '../../../lib/format';
import type { AttemptDto } from '@azmoonak/shared';

interface Analytics {
  totals: {
    questions: number;
    attempts: number;
    averagePercent: number;
    pendingManual: number;
  };
  distribution: Array<{ range: string; count: number }>;
  questions: Array<{
    questionId: string;
    orderIndex: number;
    type: string;
    title: string;
    points: number;
    answersCount: number;
    gradedCount: number;
    correctCount: number;
    correctRate: number | null;
    averagePoints: number;
    distribution: Array<{ optionId: string; text: string; count: number; isCorrect: boolean }>;
  }>;
}

interface SurveyResult {
  questionId: string;
  type: string;
  title: string;
  responseCount: number;
  average: number | null;
  breakdown: Array<{ optionId: string; text: string; count: number; percent: number }>;
  comments: string[];
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = {
  GRADED: 'green',
  SUBMITTED: 'amber',
  IN_PROGRESS: 'blue',
  EXPIRED: 'slate',
};

const STATUS_LABEL: Record<string, string> = {
  GRADED: 'نمره‌شده',
  SUBMITTED: 'در انتظار داوری',
  IN_PROGRESS: 'در حال انجام',
  EXPIRED: 'منقضی',
};

export function ResultsTab({ examId, isSurvey }: { examId: string; isSurvey: boolean }) {
  const { push } = useToast();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [attempts, setAttempts] = useState<AttemptDto[]>([]);
  const [survey, setSurvey] = useState<SurveyResult[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsData, attemptData] = await Promise.all([
        api.get<Analytics>(`/admin/results/exams/${examId}/analytics`),
        api.get<{ items: AttemptDto[] }>(`/admin/attempts?examId=${examId}&pageSize=200`),
      ]);
      setAnalytics(analyticsData);
      setAttempts(attemptData.items);
      if (isSurvey) {
        const surveyData = await api.get<{ results: SurveyResult[] }>(
          `/admin/results/exams/${examId}/survey-results`,
        );
        setSurvey(surveyData.results);
      }
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت نتایج ممکن نشد.', 'error');
    } finally {
      setLoading(false);
    }
  }, [examId, isSurvey, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const exportCsv = async () => {
    try {
      const response = await fetch(`/api/admin/results/exams/${examId}/export.csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error('خطا در خروجی');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `azmoonak-${examId.slice(0, 8)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      push('فایل اکسل دانلود شد.', 'success');
    } catch {
      push('دریافت فایل خروجی ناموفق بود.', 'error');
    }
  };

  if (loading) return <div className="py-10 text-center text-sm text-ink-500">در حال بارگذاری…</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="شرکت‌کنندگان" value={faNumber(analytics?.totals.attempts ?? 0)} />
        <Stat
          label="میانگین درصد"
          value={percent(analytics?.totals.averagePercent ?? 0)}
          tone="green"
        />
        <Stat
          label="در انتظار داوری"
          value={faNumber(analytics?.totals.pendingManual ?? 0)}
          tone="amber"
        />
        <Stat label="سوال‌ها" value={faNumber(analytics?.totals.questions ?? 0)} tone="sky" />
      </div>

      {attempts.length > 0 ? (
        <Card
          title="لیست شرکت‌کنندگان"
          actions={
            <Button variant="soft" className="text-xs" onClick={() => void exportCsv()}>
              خروجی Excel (CSV)
            </Button>
          }
        >
          <div className="table-wrap">
            <table className="w-full min-w-[640px]">
              <thead className="bg-ink-50/70">
                <tr>
                  <th className="th">فراگیر</th>
                  <th className="th">کد ملی</th>
                  <th className="th">نمره</th>
                  <th className="th">وضعیت</th>
                  <th className="th">زمان</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td className="td font-medium text-ink-800">
                      {attempt.participantName || 'ناشناس'}
                      {attempt.participantEmail ? (
                        <p className="text-[11px] text-ink-400" dir="ltr">
                          {attempt.participantEmail}
                        </p>
                      ) : null}
                    </td>
                    <td className="td text-xs" dir="ltr">
                      {attempt.participantNationalCode || '—'}
                    </td>
                    <td className="td">
                      <span className="font-bold text-ink-800">
                        {faNumber(attempt.score)} / {faNumber(attempt.maxScore)}
                      </span>
                    </td>
                    <td className="td">
                      <Badge tone={STATUS_TONE[attempt.status] ?? 'slate'}>
                        {STATUS_LABEL[attempt.status] ?? attempt.status}
                      </Badge>
                    </td>
                    <td className="td text-xs text-ink-500">{faDate(attempt.startedAt)}</td>
                    <td className="td">
                      <Link to={`/admin/attempts?focus=${attempt.id}`} className="btn-ghost text-xs">
                        داوری
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState
          title="هنوز شرکت‌کننده‌ای ثبت نشده"
          description="به‌محض شرکت فراگیران با کد دسترسی، نتایج اینجا نمایش داده می‌شود."
        />
      )}

      {survey ? (
        <Card title="نتایج نظرسنجی">
          <div className="space-y-4">
            {survey.map((result) => (
              <div key={result.questionId} className="rounded-xl border border-ink-200 p-4">
                <p className="text-sm font-medium text-ink-800">{result.title}</p>
                <p className="mt-1 text-[11px] text-ink-500">
                  {faNumber(result.responseCount)} پاسخ
                  {result.average !== null ? ` • میانگین: ${faNumber(result.average)}` : ''}
                </p>
                <div className="mt-3 space-y-2">
                  {result.breakdown.map((item) => (
                    <div key={item.optionId}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-ink-600">{item.text}</span>
                        <span className="font-bold text-ink-700">
                          {faNumber(item.count)} ({percent(item.percent)})
                        </span>
                      </div>
                      <Bar value={item.percent} />
                    </div>
                  ))}
                </div>
                {result.comments.length ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-brand-600">
                      نمایش {faNumber(result.comments.length)} پاسخ تشریحی
                    </summary>
                    <ul className="mt-2 space-y-1.5">
                      {result.comments.map((comment, index) => (
                        <li key={index} className="rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-600">
                          {comment}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {analytics && analytics.questions.length ? (
        <Card title="تحلیل سوال‌به‌سوال" description="درصد پاسخ درست هر سوال (دشواری)">
          <div className="space-y-4">
            {analytics.questions.map((question, index) => (
              <div key={question.questionId} className="rounded-xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 text-sm font-medium text-ink-800">
                    {faNumber(index + 1)}. {question.title}
                  </p>
                  <span className="badge bg-ink-100 text-ink-600">
                    {question.correctRate === null
                      ? 'بدون تصحیح خودکار'
                      : `${percent(question.correctRate)} درست`}
                  </span>
                </div>
                <div className="mt-3">
                  <Bar
                    value={question.correctRate ?? 0}
                    tone={
                      (question.correctRate ?? 0) >= 70
                        ? 'green'
                        : (question.correctRate ?? 0) >= 40
                          ? 'amber'
                          : 'rose'
                    }
                  />
                </div>
                <p className="mt-2 text-[11px] text-ink-500">
                  {faNumber(question.answersCount)} پاسخ • میانگین نمره:{' '}
                  {faNumber(question.averagePoints)} از {faNumber(question.points)}
                </p>
                {question.distribution.length ? (
                  <ul className="mt-3 space-y-1">
                    {question.distribution.map((option) => (
                      <li
                        key={option.optionId}
                        className="flex items-center justify-between text-[11px]"
                      >
                        <span className={option.isCorrect ? 'font-medium text-emerald-700' : 'text-ink-500'}>
                          {option.isCorrect ? '✓ ' : '○ '}
                          {option.text}
                        </span>
                        <span className="text-ink-500">{faNumber(option.count)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {analytics?.distribution.some((bucket) => bucket.count > 0) ? (
        <Card title="توزیع نمرات">
          <div className="flex h-48 items-end gap-2">
            {analytics.distribution.map((bucket) => {
              const max = Math.max(...analytics.distribution.map((item) => item.count), 1);
              return (
                <div key={bucket.range} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-ink-500">{faNumber(bucket.count)}</span>
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400"
                    style={{ height: `${(bucket.count / max) * 100}%`, minHeight: bucket.count ? 6 : 0 }}
                  />
                  <span className="text-[9px] text-ink-400">{bucket.range}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
