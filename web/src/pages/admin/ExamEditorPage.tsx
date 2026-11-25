import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CourseDto, ExamDto, QuestionDto } from '@azmoonak/shared';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Loading } from '../../components/ui';
import { QuestionsTab } from './exam/QuestionsTab';
import { AiTab } from './exam/AiTab';
import { CodesTab } from './exam/CodesTab';
import { ResultsTab } from './exam/ResultsTab';
import { SettingsTab } from './exam/SettingsTab';
import { faNumber } from '../../lib/format';

const TABS = [
  { id: 'questions', label: 'سوال‌ها' },
  { id: 'ai', label: 'هوش مصنوعی' },
  { id: 'codes', label: 'کدهای دسترسی' },
  { id: 'results', label: 'نتایج' },
  { id: 'settings', label: 'تنظیمات' },
];

export function ExamEditorPage() {
  const { id = '' } = useParams();
  const { push } = useToast();
  const [exam, setExam] = useState<ExamDto | null>(null);
  const [questions, setQuestions] = useState<QuestionDto[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [tab, setTab] = useState('questions');
  const [loading, setLoading] = useState(true);

  const loadExam = useCallback(async () => {
    try {
      const data = await api.get<ExamDto>(`/admin/exams/${id}`);
      setExam(data);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت آزمون ممکن نشد.', 'error');
    }
  }, [id, push]);

  const loadQuestions = useCallback(async () => {
    try {
      const data = await api.get<{ items: QuestionDto[] }>(`/admin/exams/${id}/questions`);
      setQuestions(data.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت سوال‌ها ممکن نشد.', 'error');
    }
  }, [id, push]);

  useEffect(() => {
    setLoading(true);
    void Promise.all([loadExam(), loadQuestions()]).finally(() => setLoading(false));
    api.get<{ items: CourseDto[] }>('/admin/courses').then((data) => setCourses(data.items));
  }, [loadExam, loadQuestions]);

  if (loading) return <Loading />;
  if (!exam) return <div className="py-10 text-center text-sm text-ink-500">آزمون یافت نشد.</div>;

  const isSurvey = exam.type === 'SURVEY' || exam.type === 'POLL';

  return (
    <div className="space-y-4">
      <header className="card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to="/admin/exams" className="text-[11px] text-brand-600 hover:underline">
              ← بازگشت به فهرست آزمون‌ها
            </Link>
            <h1 className="mt-1 truncate text-lg font-extrabold text-ink-900">{exam.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
              <Badge tone={exam.status === 'PUBLISHED' ? 'green' : 'amber'}>
                {exam.status === 'PUBLISHED'
                  ? 'منتشر شده'
                  : exam.status === 'DRAFT'
                    ? 'پیش‌نویس'
                    : exam.status === 'CLOSED'
                      ? 'بسته'
                      : 'بایگانی'}
              </Badge>
              <span className="font-mono font-bold tracking-wider text-brand-700">
                {exam.accessCode}
              </span>
              <span>{faNumber(exam.questionCount ?? 0)} سوال</span>
              <span>{faNumber(exam.attemptCount ?? 0)} شرکت</span>
              {exam.courseTitle ? <span>دوره: {exam.courseTitle}</span> : null}
            </div>
          </div>
          <a
            href={`/access/${exam.accessCode}`}
            target="_blank"
            rel="noreferrer"
            className="btn-soft text-xs"
          >
            پیش‌نمایش صفحه‌ی فراگیر
          </a>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-ink-100 pt-3">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                tab === item.id
                  ? 'bg-brand-600 text-white'
                  : 'bg-ink-100 text-ink-600 hover:bg-ink-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'questions' ? (
        <QuestionsTab examId={id} questions={questions} reload={loadQuestions} />
      ) : null}
      {tab === 'ai' ? <AiTab examId={id} /> : null}
      {tab === 'codes' ? (
        <CodesTab
          examId={id}
          accessCode={exam.accessCode}
          onRegenerate={async () => {
            const data = await api.post<{ accessCode: string }>(
              `/admin/exams/${id}/regenerate-code`,
            );
            push(`کد جدید: ${data.accessCode}`, 'success');
            await loadExam();
          }}
        />
      ) : null}
      {tab === 'results' ? <ResultsTab examId={id} isSurvey={isSurvey} /> : null}
      {tab === 'settings' ? (
        <SettingsTab exam={exam} courses={courses} onSaved={loadExam} />
      ) : null}
    </div>
  );
}
