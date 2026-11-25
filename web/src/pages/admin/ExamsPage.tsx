import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
  Toggle,
} from '../../components/ui';
import { faNumber } from '../../lib/format';
import type { CourseDto, ExamDto } from '@azmoonak/shared';

const STATUS_TONE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = {
  PUBLISHED: 'green',
  DRAFT: 'amber',
  CLOSED: 'slate',
  ARCHIVED: 'slate',
};

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'منتشر شده',
  DRAFT: 'پیش‌نویس',
  CLOSED: 'بسته',
  ARCHIVED: 'بایگانی',
};

const TYPE_LABEL: Record<string, string> = {
  EXAM: 'آزمون',
  SURVEY: 'نظرسنجی',
  POLL: 'نظرخواهی',
};

const EMPTY_FORM = {
  title: '',
  description: '',
  instructions: '',
  type: 'EXAM',
  courseId: '',
  durationMinutes: 45,
  maxAttempts: 1,
  passScore: 50,
  requireName: true,
  requireEmail: false,
  requirePhone: false,
  requireNationalCode: false,
  allowAnonymous: false,
  showResultImmediately: true,
  showCorrectAnswers: false,
  shuffleQuestions: false,
  shuffleOptions: false,
};

export function ExamsPage() {
  const { push } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<ExamDto[]>([]);
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      const [exams, courseList] = await Promise.all([
        api.get<{ items: ExamDto[] }>(`/admin/exams?${params.toString()}`),
        api.get<{ items: CourseDto[] }>('/admin/courses'),
      ]);
      setItems(exams.items);
      setCourses(courseList.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت آزمون‌ها ممکن نشد.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        ...form,
        courseId: form.courseId || null,
        durationMinutes: Number(form.durationMinutes),
        maxAttempts: Number(form.maxAttempts),
        passScore: Number(form.passScore),
      };
      const exam = await api.post<ExamDto>('/admin/exams', payload);
      push('آزمون ساخته شد. حالا سوال‌ها را اضافه کنید.', 'success');
      setOpen(false);
      navigate(`/admin/exams/${exam.id}`);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ساخت آزمون ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (exam: ExamDto) => {
    if (!confirm(`آزمون «${exam.title}» و تمام نتایج آن حذف شود؟`)) return;
    try {
      await api.delete(`/admin/exams/${exam.id}`);
      push('آزمون حذف شد.', 'success');
      void load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'حذف ناموفق بود.', 'error');
    }
  };

  const duplicate = async (exam: ExamDto) => {
    try {
      await api.post(`/admin/exams/${exam.id}/duplicate`);
      push('کپی آزمون ساخته شد.', 'success');
      void load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'کپی‌سازی ناموفق بود.', 'error');
    }
  };

  const regenerate = async (exam: ExamDto) => {
    if (!confirm('کد دسترسی جدید ساخته شود؟ کد قبلی از کار خواهد افتاد.')) return;
    try {
      const data = await api.post<{ accessCode: string }>(`/admin/exams/${exam.id}/regenerate-code`);
      push(`کد جدید: ${data.accessCode}`, 'success');
      void load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'تولید کد ناموفق بود.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-ink-900">آزمون‌ها و نظرسنجی‌ها</h1>
          <p className="mt-1 text-xs text-ink-500">
            برای هر آزمون یک کد دسترسی ساخته می‌شود تا فراگیران با آن وارد شوند.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>+ آزمون جدید</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="جستجوی عنوان یا کد…"
          className="max-w-xs"
        />
        <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="max-w-[180px]">
          <option value="">همه‌ی انواع</option>
          <option value="EXAM">آزمون</option>
          <option value="SURVEY">نظرسنجی</option>
          <option value="POLL">نظرخواهی</option>
        </Select>
        <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="max-w-[180px]">
          <option value="">همه‌ی وضعیت‌ها</option>
          <option value="DRAFT">پیش‌نویس</option>
          <option value="PUBLISHED">منتشر شده</option>
          <option value="CLOSED">بسته</option>
        </Select>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-ink-500">در حال بارگذاری…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="آزمونی وجود ندارد"
          description="اولین آزمون یا نظرسنجی خود را بسازید."
          action={<Button onClick={() => setOpen(true)}>ساخت آزمون</Button>}
        />
      ) : (
        <div className="table-wrap">
          <table className="w-full min-w-[820px]">
            <thead className="bg-ink-50/70">
              <tr>
                <th className="th">عنوان</th>
                <th className="th">نوع</th>
                <th className="th">وضعیت</th>
                <th className="th">کد دسترسی</th>
                <th className="th">سوال</th>
                <th className="th">شرکت</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {items.map((exam) => (
                <tr key={exam.id} className="transition hover:bg-ink-50/50">
                  <td className="td">
                    <Link
                      to={`/admin/exams/${exam.id}`}
                      className="font-medium text-ink-800 hover:text-brand-700"
                    >
                      {exam.title}
                    </Link>
                    {exam.courseTitle ? (
                      <p className="mt-0.5 text-[11px] text-ink-400">{exam.courseTitle}</p>
                    ) : null}
                  </td>
                  <td className="td">
                    <Badge tone={exam.type === 'EXAM' ? 'violet' : 'blue'}>
                      {TYPE_LABEL[exam.type] ?? exam.type}
                    </Badge>
                  </td>
                  <td className="td">
                    <Badge tone={STATUS_TONE[exam.status] ?? 'slate'}>
                      {STATUS_LABEL[exam.status] ?? exam.status}
                    </Badge>
                  </td>
                  <td className="td">
                    <span className="font-mono text-xs font-bold tracking-wider text-brand-700">
                      {exam.accessCode}
                    </span>
                  </td>
                  <td className="td">{faNumber(exam.questionCount ?? 0)}</td>
                  <td className="td">{faNumber(exam.attemptCount ?? 0)}</td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-1">
                      <Link to={`/admin/exams/${exam.id}`} className="btn-ghost text-xs">
                        ویرایش
                      </Link>
                      <button className="btn-ghost text-xs" onClick={() => void duplicate(exam)}>
                        کپی
                      </button>
                      <button className="btn-ghost text-xs" onClick={() => void regenerate(exam)}>
                        کد جدید
                      </button>
                      <button
                        className="btn-ghost text-xs text-rose-600"
                        onClick={() => void remove(exam)}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="آزمون / نظرسنجی جدید"
        size="lg"
        footer={
          <>
            <Button variant="soft" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={(event) => void create(event as unknown as FormEvent)} disabled={busy}>
              {busy ? 'در حال ساخت…' : 'ساخت و ادامه'}
            </Button>
          </>
        }
      >
        <form onSubmit={create} className="space-y-4">
          <div>
            <Label>عنوان</Label>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="مثلاً آزمون پایانی دوره‌ی شبکه"
              required
            />
          </div>
          <div>
            <Label>توضیح</Label>
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>نوع</Label>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                <option value="EXAM">آزمون (نمره‌دار)</option>
                <option value="SURVEY">نظرسنجی</option>
                <option value="POLL">نظرخواهی</option>
              </Select>
            </div>
            <div>
              <Label>دوره</Label>
              <Select
                value={form.courseId}
                onChange={(event) => setForm({ ...form, courseId: event.target.value })}
              >
                <option value="">بدون دوره</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label hint="(دقیقه، ۰ = بدون محدودیت)">مدت آزمون</Label>
              <Input
                type="number"
                min={0}
                value={form.durationMinutes}
                onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })}
              />
            </div>
            <div>
              <Label hint="(۰ = نامحدود)">حداکثر دفعات شرکت</Label>
              <Input
                type="number"
                min={0}
                value={form.maxAttempts}
                onChange={(event) => setForm({ ...form, maxAttempts: Number(event.target.value) })}
              />
            </div>
            <div>
              <Label hint="(درصد)">نمره‌ی قبولی</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.passScore}
                onChange={(event) => setForm({ ...form, passScore: Number(event.target.value) })}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Toggle
              checked={form.requireName}
              onChange={(value) => setForm({ ...form, requireName: value })}
              label="دریافت نام فراگیر"
              description="برای شناسایی شرکت‌کننده"
            />
            <Toggle
              checked={form.requireNationalCode}
              onChange={(value) => setForm({ ...form, requireNationalCode: value })}
              label="دریافت کد ملی"
            />
            <Toggle
              checked={form.requireEmail}
              onChange={(value) => setForm({ ...form, requireEmail: value })}
              label="دریافت ایمیل"
            />
            <Toggle
              checked={form.requirePhone}
              onChange={(value) => setForm({ ...form, requirePhone: value })}
              label="دریافت شماره تماس"
            />
            <Toggle
              checked={form.allowAnonymous}
              onChange={(value) => setForm({ ...form, allowAnonymous: value })}
              label="امکان شرکت ناشناس"
              description="فقط برای نظرسنجی‌ها پیشنهاد می‌شود"
            />
            <Toggle
              checked={form.showResultImmediately}
              onChange={(value) => setForm({ ...form, showResultImmediately: value })}
              label="نمایش نتیجه پس از آزمون"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
