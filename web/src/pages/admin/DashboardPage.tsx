import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Badge, Card, EmptyState, Loading, Stat } from '../../components/ui';
import { faDate, faNumber } from '../../lib/format';
import { useAuth } from '../../lib/auth';

interface Overview {
  totals: {
    courses: number;
    exams: number;
    published: number;
    questions: number;
    attempts: number;
    answers: number;
    attemptsToday: number;
  };
  recent: Array<{
    id: string;
    examTitle: string;
    participantName: string;
    status: string;
    score: number;
    maxScore: number;
    createdAt: number;
  }>;
  topExams: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    attemptCount: number;
  }>;
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'slate' | 'blue'> = {
  GRADED: 'green',
  SUBMITTED: 'amber',
  IN_PROGRESS: 'blue',
  EXPIRED: 'slate',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Overview>('/admin/overview')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <EmptyState title="اطلاعاتی برای نمایش نیست" />;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-lg font-extrabold text-ink-900">
          سلام {user?.fullName} 👋
        </h1>
        <p className="mt-1 text-xs text-ink-500">نمای کلی سامانه ازمونک</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="آزمون‌ها" value={faNumber(data.totals.exams)} hint={`${faNumber(data.totals.published)} منتشر شده`} />
        <Stat label="دوره‌ها" value={faNumber(data.totals.courses)} tone="sky" />
        <Stat label="سوال‌ها" value={faNumber(data.totals.questions)} tone="amber" />
        <Stat
          label="شرکت‌کنندگان"
          value={faNumber(data.totals.attempts)}
          hint={`${faNumber(data.totals.attemptsToday)} نفر امروز`}
          tone="green"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="آخرین شرکت‌کنندگان" description="۸ مورد آخر">
          {data.recent.length === 0 ? (
            <EmptyState title="هنوز شرکت‌کننده‌ای ثبت نشده" />
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.recent.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-800">
                      {item.participantName || 'ناشناس'}
                    </p>
                    <p className="truncate text-[11px] text-ink-400">{item.examTitle}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs font-bold text-ink-700">
                      {faNumber(item.score)}/{faNumber(item.maxScore)}
                    </span>
                    <Badge tone={STATUS_TONE[item.status] ?? 'slate'}>
                      {item.status === 'GRADED'
                        ? 'نمره‌شده'
                        : item.status === 'SUBMITTED'
                          ? 'در انتظار داوری'
                          : item.status === 'IN_PROGRESS'
                            ? 'در حال انجام'
                            : 'منقضی'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="پرطرفدارترین آزمون‌ها"
          description="بر اساس تعداد شرکت‌کننده"
          actions={
            <Link to="/admin/exams" className="text-xs text-brand-600 hover:underline">
              مدیریت آزمون‌ها
            </Link>
          }
        >
          {data.topExams.length === 0 ? (
            <EmptyState title="آزمونی ثبت نشده" />
          ) : (
            <ul className="space-y-2">
              {data.topExams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-ink-50/70 px-3 py-2.5"
                >
                  <Link
                    to={`/admin/exams/${exam.id}`}
                    className="truncate text-sm font-medium text-ink-800 hover:text-brand-700"
                  >
                    {exam.title}
                  </Link>
                  <span className="badge bg-white text-ink-600">
                    {faNumber(exam.attemptCount)} شرکت
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="راهنمای سریع">
        <div className="grid gap-3 text-xs leading-7 text-ink-600 sm:grid-cols-3">
          <p>
            <b className="text-ink-800">۱. دوره بسازید:</b> از بخش «دوره‌ها» یک دوره تعریف کنید و
            آزمون‌ها را به آن متصل نمایید.
          </p>
          <p>
            <b className="text-ink-800">۲. سوال اضافه کنید:</b> در ویرایشگر آزمون، سوال‌ها را دستی
            بنویسید یا عکس/PDF برگه را به هوش مصنوعی بدهید.
          </p>
          <p>
            <b className="text-ink-800">۳. کد بدهید:</b> کد عمومی آزمون یا کد اختصاصی برای هر
            فراگیر بسازید و برایشان ارسال کنید.
          </p>
        </div>
      </Card>
    </div>
  );
}
