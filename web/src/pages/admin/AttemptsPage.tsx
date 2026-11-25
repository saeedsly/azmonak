import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AnswerDto, AttemptDto, QuestionDto } from '@azmoonak/shared';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, EmptyState, Input, Loading, Modal, Select } from '../../components/ui';
import { faDate, faNumber } from '../../lib/format';

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

interface AttemptDetail {
  attempt: AttemptDto;
  exam: { id: string; title: string; type: string; passScore: number };
  questions: QuestionDto[];
  answers: AnswerDto[];
}

interface AiSuggestion {
  answerId: string;
  questionId: string;
  questionTitle: string;
  maxPoints: number;
  pointsAwarded: number;
  feedback: string;
  reasoning: string;
  answerValue: unknown;
}

export function AttemptsPage() {
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const [attempts, setAttempts] = useState<AttemptDto[]>([]);
  const [exams, setExams] = useState<Array<{ id: string; title: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [examFilter, setExamFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [focusId, setFocusId] = useState<string | null>(params.get('focus'));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (examFilter) query.set('examId', examFilter);
      if (statusFilter) query.set('status', statusFilter);
      if (search) query.set('search', search);
      const data = await api.get<{ items: AttemptDto[] }>(`/admin/attempts?${query.toString()}`);
      setAttempts(data.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت پاسخ‌ها ممکن نشد.', 'error');
    } finally {
      setLoading(false);
    }
  }, [examFilter, statusFilter, search, push]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    api
      .get<{ items: Array<{ id: string; title: string }> }>('/admin/exams?pageSize=200')
      .then((data) => setExams(data.items));
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-extrabold text-ink-900">پاسخ‌ها و داوری</h1>
        <p className="mt-1 text-xs text-ink-500">
          پاسخ‌های تشریحی را بررسی و نمره‌دهی کنید؛ می‌توانید از پیشنهاد هوش مصنوعی هم کمک بگیرید.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی نام، ایمیل یا کد ملی…"
          className="max-w-xs"
        />
        <Select
          value={examFilter}
          onChange={(event) => setExamFilter(event.target.value)}
          className="max-w-[240px]"
        >
          <option value="">همه‌ی آزمون‌ها</option>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="max-w-[200px]"
        >
          <option value="">همه‌ی وضعیت‌ها</option>
          <option value="GRADED">نمره‌شده</option>
          <option value="SUBMITTED">در انتظار داوری</option>
          <option value="IN_PROGRESS">در حال انجام</option>
        </Select>
      </div>

      {loading ? (
        <Loading />
      ) : attempts.length === 0 ? (
        <EmptyState title="پاسخی ثبت نشده" description="پس از شرکت فراگیران، پاسخ‌ها اینجا نمایش داده می‌شود." />
      ) : (
        <div className="table-wrap">
          <table className="w-full min-w-[720px]">
            <thead className="bg-ink-50/70">
              <tr>
                <th className="th">فراگیر</th>
                <th className="th">آزمون</th>
                <th className="th">نمره</th>
                <th className="th">وضعیت</th>
                <th className="th">زمان</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {attempts.map((attempt) => (
                <tr key={attempt.id} className="transition hover:bg-ink-50/50">
                  <td className="td font-medium text-ink-800">
                    {attempt.participantName || 'ناشناس'}
                    {attempt.participantNationalCode ? (
                      <p className="text-[11px] text-ink-400" dir="ltr">
                        {attempt.participantNationalCode}
                      </p>
                    ) : null}
                  </td>
                  <td className="td text-xs">{attempt.examTitle}</td>
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
                    <Button
                      variant="soft"
                      className="text-xs"
                      onClick={() => {
                        setFocusId(attempt.id);
                        setParams({ focus: attempt.id });
                      }}
                    >
                      داوری
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {focusId ? (
        <GradingPanel
          attemptId={focusId}
          onClose={() => {
            setFocusId(null);
            setParams({});
          }}
          onSaved={load}
        />
      ) : null}
    </div>
  );
}

function GradingPanel({
  attemptId,
  onClose,
  onSaved,
}: {
  attemptId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { push } = useToast();
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<AttemptDetail>(`/admin/attempts/${attemptId}`);
      setDetail(data);
      const nextScores: Record<string, number> = {};
      const nextFeedbacks: Record<string, string> = {};
      for (const answer of data.answers) {
        nextScores[answer.id] = answer.pointsAwarded;
        nextFeedbacks[answer.id] = answer.feedback;
      }
      setScores((current) => ({ ...nextScores, ...current }));
      setFeedbacks((current) => ({ ...nextFeedbacks, ...current }));
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت جزئیات ممکن نشد.', 'error');
    }
  }, [attemptId, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const askAi = async () => {
    setAiBusy(true);
    try {
      const data = await api.post<{ suggestions: AiSuggestion[]; demo: boolean }>('/admin/ai/grade', {
        attemptId,
      });
      setSuggestions(data.suggestions);
      if (data.demo) {
        push('هوش مصنوعی تنظیم نشده است؛ نمره‌های پیشنهادی نمایشی است.', 'info');
      }
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت پیشنهاد ناموفق بود.', 'error');
    } finally {
      setAiBusy(false);
    }
  };

  const applySuggestion = (suggestion: AiSuggestion) => {
    setScores((current) => ({ ...current, [suggestion.answerId]: suggestion.pointsAwarded }));
    setFeedbacks((current) => ({ ...current, [suggestion.answerId]: suggestion.feedback }));
  };

  const saveAll = async () => {
    setBusy(true);
    try {
      const grades = Object.entries(scores).map(([answerId, points]) => ({
        answerId,
        pointsAwarded: points,
        feedback: feedbacks[answerId] ?? '',
      }));
      await api.post(`/admin/attempts/${attemptId}/grade-bulk`, { attemptId, grades });
      await api.post(`/admin/attempts/${attemptId}/finalize`);
      push('نمرات ذخیره و نتیجه نهایی شد.', 'success');
      await load();
      await onSaved();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره‌ی نمرات ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={detail ? `داوری: ${detail.attempt.participantName || 'ناشناس'}` : 'داوری'}
      footer={
        <>
          <Button variant="soft" onClick={onClose}>
            بستن
          </Button>
          <Button variant="soft" onClick={() => void askAi()} disabled={aiBusy}>
            {aiBusy ? 'در حال تحلیل…' : '🤖 پیشنهاد نمره با هوش مصنوعی'}
          </Button>
          <Button onClick={() => void saveAll()} disabled={busy}>
            {busy ? 'در حال ذخیره…' : 'ذخیره نمرات'}
          </Button>
        </>
      }
    >
      {!detail ? (
        <Loading />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-600">
            <span>
              آزمون: <b className="text-ink-800">{detail.exam.title}</b>
            </span>
            <span>
              نمره فعلی:{' '}
              <b className="text-ink-800">
                {faNumber(detail.attempt.score)} / {faNumber(detail.attempt.maxScore)}
              </b>
            </span>
            <span>
              وضعیت:{' '}
              <Badge tone={STATUS_TONE[detail.attempt.status] ?? 'slate'}>
                {STATUS_LABEL[detail.attempt.status] ?? detail.attempt.status}
              </Badge>
            </span>
          </div>

          {suggestions.length ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4">
              <p className="mb-2 text-xs font-bold text-violet-800">
                پیشنهادهای هوش مصنوعی (بررسی و تأیید کنید)
              </p>
              <ul className="space-y-2">
                {suggestions.map((suggestion) => (
                  <li
                    key={suggestion.answerId}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs text-ink-700">{suggestion.questionTitle}</p>
                      <p className="text-[11px] text-ink-500">
                        نمره پیشنهادی: {faNumber(suggestion.pointsAwarded)} از{' '}
                        {faNumber(suggestion.maxPoints)} — {suggestion.feedback}
                      </p>
                    </div>
                    <Button variant="soft" className="text-xs" onClick={() => applySuggestion(suggestion)}>
                      اعمال
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3">
            {detail.questions.map((question, index) => {
              const answer = detail.answers.find((item) => item.questionId === question.id);
              const manual = ['SHORT_TEXT', 'LONG_TEXT', 'FILE_UPLOAD'].includes(question.type);
              return (
                <div key={question.id} className="rounded-xl border border-ink-200 p-4">
                  <p className="text-sm leading-7 font-medium text-ink-800">
                    {faNumber(index + 1)}. {question.title}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-500">
                    بارم: {faNumber(question.points)} نمره
                    {answer?.isCorrect === true ? ' • پاسخ درست' : answer?.isCorrect === false ? ' • پاسخ نادرست' : ''}
                  </p>

                  {answer && answer.value !== null && answer.value !== '' ? (
                    <p className="mt-2 rounded-lg bg-ink-50 px-3 py-2 text-xs leading-7 whitespace-pre-line text-ink-700">
                      {typeof answer.value === 'string'
                        ? answer.value.startsWith('/uploads/')
                          ? '📎 فایل بارگذاری‌شده'
                          : answer.value
                        : JSON.stringify(answer.value)}
                    </p>
                  ) : (
                    <p className="mt-2 text-[11px] text-ink-400">بدون پاسخ</p>
                  )}

                  {manual ? (
                    <div className="mt-3 grid gap-3 sm:grid-cols-[140px_1fr]">
                      <div>
                        <label className="label">نمره</label>
                        <Input
                          type="number"
                          min={0}
                          max={question.points}
                          step={0.25}
                          value={scores[answer?.id ?? question.id] ?? 0}
                          onChange={(event) =>
                            setScores((current) => ({
                              ...current,
                              [answer?.id ?? question.id]: Number(event.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="label">بازخورد به فراگیر</label>
                        <Input
                          value={feedbacks[answer?.id ?? question.id] ?? ''}
                          onChange={(event) =>
                            setFeedbacks((current) => ({
                              ...current,
                              [answer?.id ?? question.id]: event.target.value,
                            }))
                          }
                          placeholder="توضیح نمره…"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
