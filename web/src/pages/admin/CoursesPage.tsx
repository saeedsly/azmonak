import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Button, Card, EmptyState, Input, Label, Modal, Select, Textarea } from '../../components/ui';
import { faNumber } from '../../lib/format';
import type { CourseDto } from '@azmoonak/shared';

const EMPTY = { title: '', description: '', code: '', instructor: '', color: '#4f46e5' };

export function CoursesPage() {
  const { push } = useToast();
  const [items, setItems] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<CourseDto | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: CourseDto[] }>(
        `/admin/courses${search ? `?search=${encodeURIComponent(search)}` : ''}`,
      );
      setItems(data.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت دوره‌ها ممکن نشد.', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (course: CourseDto) => {
    setEditing(course);
    setForm({
      title: course.title,
      description: course.description,
      code: course.code,
      instructor: course.instructor,
      color: course.color || '#4f46e5',
    });
    setOpen(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (editing) {
        await api.patch(`/admin/courses/${editing.id}`, form);
        push('دوره به‌روزرسانی شد.', 'success');
      } else {
        await api.post('/admin/courses', form);
        push('دوره ساخته شد.', 'success');
      }
      setOpen(false);
      void load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره‌ی دوره ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (course: CourseDto) => {
    if (!confirm(`دوره «${course.title}» حذف شود؟`)) return;
    try {
      await api.delete(`/admin/courses/${course.id}`);
      push('دوره حذف شد.', 'success');
      void load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'حذف ناموفق بود.', 'error');
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-ink-900">دوره‌ها</h1>
          <p className="mt-1 text-xs text-ink-500">
            دوره‌ها دسته‌بندی آزمون‌ها و نظرسنجی‌های شما هستند.
          </p>
        </div>
        <Button onClick={openCreate}>+ دوره‌ی جدید</Button>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="جستجوی دوره…"
        className="max-w-sm"
      />

      {loading ? (
        <div className="py-10 text-center text-sm text-ink-500">در حال بارگذاری…</div>
      ) : items.length === 0 ? (
        <EmptyState
          title="هنوز دوره‌ای نساخته‌اید"
          description="برای دسته‌بندی آزمون‌ها یک دوره بسازید."
          action={
            <Button onClick={openCreate} variant="soft">
              ساخت دوره
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((course) => (
            <Card key={course.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-bold text-ink-900">{course.title}</h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-6 text-ink-500">
                    {course.description || 'بدون توضیح'}
                  </p>
                </div>
                {course.color ? (
                  <span
                    className="h-8 w-8 shrink-0 rounded-xl"
                    style={{ backgroundColor: course.color }}
                  />
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-500">
                {course.code ? <span className="badge bg-ink-100">{course.code}</span> : null}
                {course.instructor ? <span>مدرس: {course.instructor}</span> : null}
                <span>
                  {faNumber(course.examCount ?? 0)} آزمون • {faNumber(course.questionCount ?? 0)} سوال
                </span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="soft" className="text-xs" onClick={() => openEdit(course)}>
                  ویرایش
                </Button>
                <Button variant="ghost" className="text-xs text-rose-600" onClick={() => void remove(course)}>
                  حذف
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'ویرایش دوره' : 'دوره‌ی جدید'}
        footer={
          <>
            <Button variant="soft" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button onClick={(event) => void save(event as unknown as FormEvent)} disabled={busy}>
              {busy ? 'در حال ذخیره…' : 'ذخیره'}
            </Button>
          </>
        }
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <Label>عنوان دوره</Label>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
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
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>کد دوره</Label>
              <Input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                dir="ltr"
                className="text-right"
              />
            </div>
            <div>
              <Label>مدرس</Label>
              <Input
                value={form.instructor}
                onChange={(event) => setForm({ ...form, instructor: event.target.value })}
              />
            </div>
            <div>
              <Label>رنگ</Label>
              <Input
                type="color"
                value={form.color}
                onChange={(event) => setForm({ ...form, color: event.target.value })}
                className="h-11 p-1"
              />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
