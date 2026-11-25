import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../../../lib/api';
import { useToast } from '../../../lib/toast';
import { Badge, Button, Card, CodeBox, Input, Label } from '../../../components/ui';
import { faDate, faNumber } from '../../../lib/format';
import type { InviteDto } from '@azmoonak/shared';

export function CodesTab({
  examId,
  accessCode,
  onRegenerate,
}: {
  examId: string;
  accessCode: string;
  onRegenerate: () => Promise<void>;
}) {
  const { push } = useToast();
  const [invites, setInvites] = useState<InviteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(10);
  const [label, setLabel] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ items: InviteDto[] }>(`/admin/exams/${examId}/invites`);
      setInvites(data.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'دریافت کدها ممکن نشد.', 'error');
    } finally {
      setLoading(false);
    }
  }, [examId, push]);

  useEffect(() => {
    void load();
  }, [load]);

  const generate = async () => {
    setBusy(true);
    try {
      await api.post(`/admin/exams/${examId}/invites`, {
        count: Number(count),
        label,
        maxUses: Number(maxUses),
      });
      push('کدهای اختصاصی ساخته شد.', 'success');
      setLabel('');
      await load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ساخت کد ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (invite: InviteDto) => {
    try {
      await api.delete(`/admin/invites/${invite.id}`);
      push('کد غیرفعال شد.', 'success');
      await load();
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'غیرفعال‌سازی ناموفق بود.', 'error');
    }
  };

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      push('کد کپی شد.', 'success');
    } catch {
      push('کپی خودکار ممکن نبود؛ کد را دستی کپی کنید.', 'info');
    }
  };

  return (
    <div className="space-y-4">
      <Card
        title="کد عمومی آزمون"
        description="این کد را در کانال عمومی یا گروه کلاسی خود منتشر کنید؛ همه‌ی فراگیران با آن می‌توانند شرکت کنند."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <CodeBox
            value={accessCode}
            label="کد ورود آزمون"
            hint="فراگیر این کد را در صفحه‌ی اصلی وارد می‌کند."
          />
          <div className="rounded-xl border border-ink-200 p-4">
            <p className="mb-2 text-xs font-bold text-ink-700">کنترل کد</p>
            <p className="mb-3 text-[11px] leading-6 text-ink-500">
              اگر کد در جایی عمومی لو رفت، می‌توانید کد جدید بسازید تا کد قبلی از کار بیفتد.
            </p>
            <Button variant="soft" className="text-xs" onClick={() => void onRegenerate()}>
              ساخت کد جدید
            </Button>
          </div>
        </div>
      </Card>

      <Card
        title="کدهای اختصاصی (یک کد برای هر فراگیر)"
        description="برای کنترل حضور و غیاب می‌توانید برای هر فراگیر یک کد یک‌بارمصرف بسازید."
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label>تعداد کد</Label>
            <Input
              type="number"
              min={1}
              max={200}
              value={count}
              onChange={(event) => setCount(Number(event.target.value))}
            />
          </div>
          <div>
            <Label hint="(اختیاری)">برچسب</Label>
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="مثلاً کلاس الف"
            />
          </div>
          <div>
            <Label>حداکثر استفاده</Label>
            <Input
              type="number"
              min={1}
              max={999}
              value={maxUses}
              onChange={(event) => setMaxUses(Number(event.target.value))}
            />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => void generate()} disabled={busy}>
              {busy ? 'در حال ساخت…' : 'ساخت کدها'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-ink-500">در حال بارگذاری…</div>
        ) : invites.length === 0 ? (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-6 text-center text-xs text-ink-500">
            هنوز کد اختصاصی ساخته نشده است.
          </p>
        ) : (
          <div className="mt-4 max-h-96 overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr>
                  <th className="th">کد</th>
                  <th className="th">برچسب</th>
                  <th className="th">استفاده</th>
                  <th className="th">انقضا</th>
                  <th className="th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {invites.map((invite) => (
                  <tr key={invite.id}>
                    <td className="td font-mono text-xs font-bold tracking-wider text-brand-700">
                      {invite.code}
                    </td>
                    <td className="td">{invite.label || '—'}</td>
                    <td className="td">
                      <Badge tone={invite.usedCount >= invite.maxUses ? 'red' : 'green'}>
                        {faNumber(invite.usedCount)} از {faNumber(invite.maxUses)}
                      </Badge>
                    </td>
                    <td className="td text-xs">{faDate(invite.expiresAt)}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button className="btn-ghost text-xs" onClick={() => void copy(invite.code)}>
                          کپی
                        </button>
                        {invite.isActive ? (
                          <button
                            className="btn-ghost text-xs text-rose-600"
                            onClick={() => void deactivate(invite)}
                          >
                            غیرفعال
                          </button>
                        ) : (
                          <span className="text-[11px] text-ink-400">غیرفعال</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
