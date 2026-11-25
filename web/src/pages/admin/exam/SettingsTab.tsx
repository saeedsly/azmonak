import { useEffect, useState } from 'react';
import type { CourseDto, ExamDto } from '@azmoonak/shared';
import { api, ApiError } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { Button, Card, Input, Label, Select, Textarea, Toggle } from '../../../components/ui';

export function SettingsTab({
  exam,
  courses,
  onSaved,
}: {
  exam: ExamDto;
  courses: CourseDto[];
  onSaved: () => Promise<void>;
}) {
  const { push } = useToast();
  const [form, setForm] = useState(() => ({
    title: exam.title,
    description: exam.description,
    instructions: exam.instructions,
    courseId: exam.courseId ?? '',
    type: exam.type,
    status: exam.status,
    durationMinutes: exam.durationMinutes,
    maxAttempts: exam.maxAttempts,
    passScore: exam.passScore,
    startAt: exam.startAt ? new Date(exam.startAt).toISOString().slice(0, 16) : '',
    endAt: exam.endAt ? new Date(exam.endAt).toISOString().slice(0, 16) : '',
    requireName: exam.requireName,
    requireEmail: exam.requireEmail,
    requirePhone: exam.requirePhone,
    requireNationalCode: exam.requireNationalCode,
    allowAnonymous: exam.allowAnonymous,
    showResultImmediately: exam.showResultImmediately,
    showCorrectAnswers: exam.showCorrectAnswers,
    showPerQuestionFeedback: exam.showPerQuestionFeedback,
    shuffleQuestions: exam.shuffleQuestions,
    shuffleOptions: exam.shuffleOptions,
  }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm((current) => ({ ...current, title: exam.title, status: exam.status }));
  }, [exam.title, exam.status]);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        ...form,
        courseId: form.courseId || null,
        startAt: form.startAt ? new Date(form.startAt).getTime() : null,
        endAt: form.endAt ? new Date(form.endAt).getTime() : null,
        durationMinutes: Number(form.durationMinutes),
        maxAttempts: Number(form.maxAttempts),
        passScore: Number(form.passScore),
      };
      await api.patch(`/admin/exams/${exam.id}`, payload);
      push('تنظیمات ذخیره شد.', 'success');
      await onSaved();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره‌ی تنظیمات ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card title="اطلاعات آزمون">
        <div className="space-y-4">
          <div>
            <Label>عنوان</Label>
            <Input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div>
            <Label>توضیح</Label>
            <Textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div>
            <Label hint="(در ابتدای صفحه‌ی آزمون به فراگیر نشان داده می‌شود)">راهنمای شرکت در آزمون</Label>
            <Textarea
              value={form.instructions}
              onChange={(event) => setForm({ ...form, instructions: event.target.value })}
              placeholder="مثلاً: مدت آزمون ۳۰ دقیقه است و نمره‌ی منفی ندارد."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
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
              <Label>نوع</Label>
              <Select
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value as never })}
              >
                <option value="EXAM">آزمون</option>
                <option value="SURVEY">نظرسنجی</option>
                <option value="POLL">نظرخواهی</option>
              </Select>
            </div>
            <div>
              <Label>وضعیت انتشار</Label>
              <Select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as never })}
              >
                <option value="DRAFT">پیش‌نویس (غیرقابل شرکت)</option>
                <option value="PUBLISHED">منتشر شده</option>
                <option value="CLOSED">بسته شده</option>
                <option value="ARCHIVED">بایگانی</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      <Card title="زمان‌بندی و نمره">
        <div className="grid gap-4 sm:grid-cols-3">
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
          <div>
            <Label hint="(اختیاری)">شروع شرکت</Label>
            <Input
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => setForm({ ...form, startAt: event.target.value })}
            />
          </div>
          <div>
            <Label hint="(اختیاری)">پایان شرکت</Label>
            <Input
              type="datetime-local"
              value={form.endAt}
              onChange={(event) => setForm({ ...form, endAt: event.target.value })}
            />
          </div>
        </div>
      </Card>

      <Card title="مشخصات فراگیر">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={form.requireName}
            onChange={(value) => setForm({ ...form, requireName: value })}
            label="دریافت نام و نام خانوادگی"
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
          />
        </div>
      </Card>

      <Card title="نمایش نتیجه">
        <div className="grid gap-2 sm:grid-cols-2">
          <Toggle
            checked={form.showResultImmediately}
            onChange={(value) => setForm({ ...form, showResultImmediately: value })}
            label="نمایش نمره بلافاصله بعد از آزمون"
          />
          <Toggle
            checked={form.showCorrectAnswers}
            onChange={(value) => setForm({ ...form, showCorrectAnswers: value })}
            label="نمایش پاسخ‌های درست"
            description="برای آزمون تمرینی پیشنهاد می‌شود"
          />
          <Toggle
            checked={form.showPerQuestionFeedback}
            onChange={(value) => setForm({ ...form, showPerQuestionFeedback: value })}
            label="نمایش پاسخ تشریحی هر سوال"
          />
          <Toggle
            checked={form.shuffleQuestions}
            onChange={(value) => setForm({ ...form, shuffleQuestions: value })}
            label="ترتیب تصادفی سوال‌ها"
          />
          <Toggle
            checked={form.shuffleOptions}
            onChange={(value) => setForm({ ...form, shuffleOptions: value })}
            label="ترتیب تصادفی گزینه‌ها"
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void save()} disabled={busy}>
          {busy ? 'در حال ذخیره…' : 'ذخیره تنظیمات'}
        </Button>
      </div>
    </div>
  );
}
