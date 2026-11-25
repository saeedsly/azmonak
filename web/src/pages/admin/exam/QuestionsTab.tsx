import { useState } from 'react';
import type { QuestionDto } from '@azmoonak/shared';
import { QUESTION_TYPE_SHORT_LABELS } from '@azmoonak/shared';
import { api, ApiError } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { Button, EmptyState, Modal } from '../../../components/ui';
import { QuestionForm, emptyQuestion, type QuestionDraft } from '../../../components/QuestionForm';
import { faNumber } from '../../../lib/format';

function toDraft(question: QuestionDto): QuestionDraft {
  return {
    type: question.type,
    title: question.title,
    description: question.description,
    imageUrl: question.imageUrl,
    points: question.points,
    explanation: question.explanation,
    difficulty: question.difficulty,
    tags: question.tags,
    isRequired: question.isRequired,
    allowPartialCredit: question.allowPartialCredit,
    options: question.options.map((option) => ({ ...option })),
    matrixConfig: question.matrixConfig,
    ratingConfig: question.ratingConfig,
  };
}

export function QuestionsTab({
  examId,
  questions,
  reload,
}: {
  examId: string;
  questions: QuestionDto[];
  reload: () => Promise<void>;
}) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuestionDto | null>(null);
  const [draft, setDraft] = useState<QuestionDraft>(emptyQuestion());
  const [busy, setBusy] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyQuestion());
    setOpen(true);
  };

  const openEdit = (question: QuestionDto) => {
    setEditing(question);
    setDraft(toDraft(question));
    setOpen(true);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      push('متن سوال را وارد کنید.', 'error');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...draft,
        options: draft.options.filter((option) => option.text.trim()),
      };
      if (editing) {
        await api.patch(`/admin/questions/${editing.id}`, payload);
        push('سوال به‌روزرسانی شد.', 'success');
      } else {
        await api.post(`/admin/exams/${examId}/questions`, { questions: [payload] });
        push('سوال افزوده شد.', 'success');
      }
      setOpen(false);
      await reload();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره‌ی سوال ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (question: QuestionDto) => {
    if (!confirm('این سوال حذف شود؟')) return;
    try {
      await api.delete(`/admin/questions/${question.id}`);
      push('سوال حذف شد.', 'success');
      await reload();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'حذف ناموفق بود.', 'error');
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    const order = questions.map((question, i) => ({ id: question.id, orderIndex: i }));
    const [a] = order.splice(index, 1);
    order.splice(target, 0, a);
    try {
      await api.post(`/admin/exams/${examId}/questions/reorder`, {
        order: order.map((item, i) => ({ id: item.id, orderIndex: i })),
      });
      await reload();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'جابه‌جایی ناموفق بود.', 'error');
    }
  };

  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-500">
          {faNumber(questions.length)} سوال • مجموع بارم: {faNumber(totalPoints)} نمره
        </p>
        <Button onClick={openCreate}>+ سوال جدید</Button>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          title="هنوز سوالی اضافه نشده"
          description="می‌توانید سوال را دستی بنویسید یا از بخش «هوش مصنوعی» عکس برگه‌ی آزمون را وارد کنید."
          action={<Button onClick={openCreate}>افزودن سوال</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {questions.map((question, index) => (
            <article key={question.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="badge bg-brand-100 text-brand-700">
                      سوال {faNumber(index + 1)}
                    </span>
                    <span className="badge bg-ink-100 text-ink-600">
                      {QUESTION_TYPE_SHORT_LABELS[question.type]}
                    </span>
                    <span className="badge bg-ink-100 text-ink-600">
                      {faNumber(question.points)} نمره
                    </span>
                    {question.source === 'AI' ? (
                      <span className="badge bg-violet-50 text-violet-700">ساخته‌شده با AI</span>
                    ) : null}
                    {question.tags.map((tag) => (
                      <span key={tag} className="badge bg-sky-50 text-sky-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm leading-7 font-medium text-ink-800">
                    {question.title}
                  </p>
                  {question.options.length ? (
                    <ul className="mt-2 space-y-1">
                      {question.options.map((option) => (
                        <li
                          key={option.id}
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
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button className="btn-ghost text-xs" onClick={() => void move(index, -1)}>
                    ↑
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => void move(index, 1)}>
                    ↓
                  </button>
                  <button className="btn-ghost text-xs" onClick={() => openEdit(question)}>
                    ویرایش
                  </button>
                  <button
                    className="btn-ghost text-xs text-rose-600"
                    onClick={() => void remove(question)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'ویرایش سوال' : 'سوال جدید'}
        size="lg"
        footer={
          <>
            <Button variant="soft" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? 'در حال ذخیره…' : 'ذخیره سوال'}
            </Button>
          </>
        }
      >
        <QuestionForm value={draft} onChange={setDraft} />
      </Modal>
    </div>
  );
}
