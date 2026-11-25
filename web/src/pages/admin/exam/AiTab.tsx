import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, Label, Select, Textarea } from '../../../components/ui';
import { QUESTION_TYPE_LABELS, QUESTION_TYPES } from '@azmoonak/shared';
import { faNumber } from '../../../lib/format';

interface AiStatus {
  provider: string;
  configured: boolean;
  demo: boolean;
  model: string;
  message: string;
}

interface ParsedQuestion {
  type: string;
  title: string;
  description: string;
  options: Array<{ text: string; isCorrect: boolean }>;
  points: number;
  difficulty: number;
  explanation: string;
  tags: string[];
  confidence: number;
  warnings: string[];
}

interface ExtractionResult {
  questions: ParsedQuestion[];
  notes: string;
  provider: string;
  model: string;
  demo: boolean;
}

export function AiTab({ examId }: { examId: string }) {
  const { push } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [types, setTypes] = useState<string[]>(['MULTIPLE_CHOICE', 'TRUE_FALSE']);
  const [difficulty, setDifficulty] = useState(3);

  useEffect(() => {
    api.get<AiStatus>('/admin/ai/status').then(setStatus).catch(() => undefined);
  }, []);

  const extract = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      push('ابتدا عکس یا PDF برگه‌ی آزمون را انتخاب کنید.', 'error');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('files', file);
      formData.append('instructions', instructions);
      const data = await api.upload<ExtractionResult>('/admin/ai/extract', formData);
      setResult(data);
      setRemoved(new Set());
      if (data.demo) {
        push('سرویس هوش مصنوعی تنظیم نشده؛ خروجی نمایشی نمایش داده می‌شود.', 'info');
      }
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'استخراج سوال ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!topic.trim()) {
      push('موضوع سوال‌ها را وارد کنید.', 'error');
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const data = await api.post<ExtractionResult>('/admin/ai/generate', {
        topic,
        questionCount: count,
        types,
        difficulty,
        language: 'fa',
      });
      setResult(data);
      setRemoved(new Set());
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'تولید سوال ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveAll = async () => {
    if (!result) return;
    const questions = result.questions
      .filter((_, index) => !removed.has(index))
      .map((question) => ({
        type: question.type,
        title: question.title,
        description: question.description,
        options: question.options.map((option, index) => ({
          id: '',
          text: option.text,
          isCorrect: option.isCorrect,
          order: index,
        })),
        points: question.points,
        difficulty: question.difficulty,
        explanation: question.explanation,
        tags: question.tags,
        isRequired: true,
        allowPartialCredit: false,
      }));
    if (questions.length === 0) {
      push('سوالی برای افزودن باقی نمانده است.', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/exams/${examId}/questions`, { questions });
      push(`${faNumber(questions.length)} سوال به آزمون اضافه شد.`, 'success');
      setResult(null);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره‌ی سوال‌ها ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const toggleType = (type: string) => {
    setTypes((current) =>
      current.includes(type) ? current.filter((item) => item !== type) : [...current, type],
    );
  };

  return (
    <div className="space-y-4">
      <Card
        title="🤖 هوش مصنوعی"
        description="برگه‌ی آزمون را به‌صورت عکس یا PDF بدهید تا سوال‌ها، گزینه‌ها و کلید پاسخ خودکار استخراج شوند."
        actions={
          status ? (
            <Badge tone={status.configured ? 'green' : 'amber'}>
              {status.configured ? `${status.provider} فعال` : 'حالت نمایشی'}
            </Badge>
          ) : null
        }
      >
        {status ? (
          <p className="mb-4 rounded-xl bg-ink-50 px-4 py-3 text-[11px] leading-6 text-ink-600">
            {status.message}
            {!status.configured
              ? ' — برای فعال‌سازی، کلید API سرویس موردنظر را در فایل .env قرار دهید و سرویس را دوباره اجرا کنید.'
              : ''}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-4">
            <p className="mb-3 text-sm font-bold text-ink-800">۱) استخراج از برگه‌ی آزمون</p>
            <Label>فایل (عکس یا PDF)</Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="field"
            />
            <div className="mt-3">
              <Label hint="(اختیاری)">دستور به هوش مصنوعی</Label>
              <Textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                placeholder="مثلاً: بارم هر سوال را از ستون سمت راست برگه بخوان و سوال‌های دانشی را وارد کن."
                className="min-h-[80px]"
              />
            </div>
            <Button className="mt-3 w-full" onClick={() => void extract()} disabled={busy}>
              {busy ? 'در حال پردازش…' : 'استخراج سوال‌ها'}
            </Button>
          </div>

          <div className="rounded-xl border border-ink-200 p-4">
            <p className="mb-3 text-sm font-bold text-ink-800">۲) تولید سوال با موضوع دلخواه</p>
            <Label>موضوع</Label>
            <Textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="مثلاً: اصول امنیت شبکه در سازمان‌ها"
              className="min-h-[80px]"
            />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label>تعداد</Label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={count}
                  onChange={(event) => setCount(Number(event.target.value))}
                  className="field"
                />
              </div>
              <div>
                <Label>دشواری</Label>
                <Select
                  value={String(difficulty)}
                  onChange={(event) => setDifficulty(Number(event.target.value))}
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Label>نوع سوال‌ها</Label>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`badge ${
                      types.includes(type)
                        ? 'bg-brand-600 text-white'
                        : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
                    }`}
                  >
                    {QUESTION_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>
            <Button
              variant="soft"
              className="mt-3 w-full"
              onClick={() => void generate()}
              disabled={busy}
            >
              {busy ? 'در حال تولید…' : 'تولید سوال'}
            </Button>
          </div>
        </div>
      </Card>

      {result ? (
        <Card
          title={`پیش‌نویس سوال‌ها (${faNumber(result.questions.length - removed.size)})`}
          description="هر سوال را می‌توانید حذف کنید؛ سپس همه را به آزمون اضافه کنید."
          actions={
            <>
              <Button variant="soft" onClick={() => setResult(null)}>
                بی‌خیال
              </Button>
              <Button onClick={() => void saveAll()} disabled={busy}>
                افزودن به آزمون
              </Button>
            </>
          }
        >
          {result.notes ? (
            <p className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
              {result.notes}
            </p>
          ) : null}

          <div className="space-y-2.5">
            {result.questions.map((question, index) =>
              removed.has(index) ? null : (
                <article key={index} className="rounded-xl border border-ink-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="badge bg-brand-100 text-brand-700">
                          {QUESTION_TYPE_LABELS[question.type as keyof typeof QUESTION_TYPE_LABELS] ??
                            question.type}
                        </span>
                        <span className="badge bg-ink-100 text-ink-600">
                          {faNumber(question.points)} نمره
                        </span>
                        <span className="badge bg-ink-100 text-ink-600">
                          اطمینان {faNumber(Math.round(question.confidence * 100))}٪
                        </span>
                      </div>
                      <p className="text-sm leading-7 font-medium text-ink-800">{question.title}</p>
                      {question.options.length ? (
                        <ul className="mt-2 space-y-1">
                          {question.options.map((option, optionIndex) => (
                            <li
                              key={optionIndex}
                              className={`text-xs ${
                                option.isCorrect ? 'font-medium text-emerald-700' : 'text-ink-500'
                              }`}
                            >
                              {option.isCorrect ? '✓ ' : '○ '}
                              {option.text}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {question.warnings?.length ? (
                        <ul className="mt-2 space-y-1">
                          {question.warnings.map((warning) => (
                            <li key={warning} className="text-[11px] text-amber-700">
                              ⚠️ {warning}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                    <button
                      className="btn-ghost shrink-0 text-xs text-rose-600"
                      onClick={() =>
                        setRemoved((current) => new Set([...current, index]))
                      }
                    >
                      حذف
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
