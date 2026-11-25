import { useEffect, useState } from 'react';
import { api, ApiError } from '../../lib/api';
import { useToast } from '../../lib/toast';
import { Badge, Button, Card, Input, Label, Modal } from '../../components/ui';
import { useAuth } from '../../lib/auth';

interface Branding {
  appName: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  supportText: string;
  footerText: string;
}

interface SettingsResponse {
  branding: Branding;
  ai: { provider: string; configured: boolean; demo: boolean; model: string; message: string };
  db: { mode: string };
}

interface UserRow {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  role: string;
}

export function SettingsPage() {
  const { push } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsResponse | null>(null);
  const [branding, setBranding] = useState<Branding | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'EDITOR',
  });

  useEffect(() => {
    api
      .get<SettingsResponse>('/admin/settings')
      .then((data) => {
        setSettings(data);
        setBranding(data.branding);
      })
      .catch(() => undefined);
    api
      .get<{ items: UserRow[] }>('/admin/users')
      .then((data) => setUsers(data.items))
      .catch(() => undefined);
  }, []);

  const saveBranding = async () => {
    if (!branding) return;
    setBusy(true);
    try {
      await api.put('/admin/settings', branding);
      push('تنظیمات ذخیره شد.', 'success');
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ذخیره ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const createUser = async () => {
    setBusy(true);
    try {
      await api.post('/admin/users', userForm);
      push('کاربر ساخته شد.', 'success');
      setUserOpen(false);
      setUserForm({ username: '', fullName: '', email: '', password: '', role: 'EDITOR' });
      const data = await api.get<{ items: UserRow[] }>('/admin/users');
      setUsers(data.items);
    } catch (error) {
      push(error instanceof ApiError ? error.message : 'ساخت کاربر ناموفق بود.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-lg font-extrabold text-ink-900">تنظیمات</h1>
        <p className="mt-1 text-xs text-ink-500">ظاهر برنامه، وضعیت سرویس‌ها و کاربران پنل</p>
      </header>

      <Card title="ظاهر برنامه" description="نام، شعار و رنگ اصلی در صفحه‌ی فراگیر نمایش داده می‌شود.">
        {branding ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>نام برنامه</Label>
                <Input
                  value={branding.appName}
                  onChange={(event) => setBranding({ ...branding, appName: event.target.value })}
                />
              </div>
              <div>
                <Label>شعار</Label>
                <Input
                  value={branding.tagline}
                  onChange={(event) => setBranding({ ...branding, tagline: event.target.value })}
                />
              </div>
              <div>
                <Label>رنگ اصلی</Label>
                <Input
                  type="color"
                  value={branding.primaryColor || '#4f46e5'}
                  onChange={(event) =>
                    setBranding({ ...branding, primaryColor: event.target.value })
                  }
                  className="h-11 p-1"
                />
              </div>
              <div>
                <Label hint="(اختیاری)">آدرس لوگو</Label>
                <Input
                  value={branding.logoUrl}
                  onChange={(event) => setBranding({ ...branding, logoUrl: event.target.value })}
                  dir="ltr"
                  className="text-right"
                />
              </div>
              <div className="sm:col-span-2">
                <Label hint="(اختیاری)">متن پشتیبانی</Label>
                <Input
                  value={branding.supportText}
                  onChange={(event) => setBranding({ ...branding, supportText: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label hint="(اختیاری)">متن پایین صفحه</Label>
                <Input
                  value={branding.footerText}
                  onChange={(event) => setBranding({ ...branding, footerText: event.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void saveBranding()} disabled={busy}>
                ذخیره ظاهر
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-ink-500">در حال بارگذاری…</p>
        )}
      </Card>

      <Card title="وضعیت سرویس‌ها">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-ink-200 p-4">
            <p className="mb-2 text-xs font-bold text-ink-700">هوش مصنوعی</p>
            {settings ? (
              <>
                <Badge tone={settings.ai.configured ? 'green' : 'amber'}>
                  {settings.ai.configured ? 'فعال' : 'حالت نمایشی'}
                </Badge>
                <p className="mt-2 text-[11px] leading-6 text-ink-500">{settings.ai.message}</p>
              </>
            ) : null}
          </div>
          <div className="rounded-xl border border-ink-200 p-4">
            <p className="mb-2 text-xs font-bold text-ink-700">پایگاه داده</p>
            {settings ? (
              <>
                <Badge tone="blue">
                  {settings.db.mode === 'mysql' ? 'MySQL' : 'SQLite (حالت آزمایشی)'}
                </Badge>
                <p className="mt-2 text-[11px] leading-6 text-ink-500">
                  برای محیط عملیاتی در فایل .env مقدار DB_MODE را روی mysql بگذارید.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <Card
        title="کاربران پنل"
        actions={
          user?.role === 'ADMIN' ? (
            <Button variant="soft" className="text-xs" onClick={() => setUserOpen(true)}>
              + کاربر جدید
            </Button>
          ) : null
        }
      >
        <div className="table-wrap">
          <table className="w-full">
            <thead className="bg-ink-50/70">
              <tr>
                <th className="th">نام کاربری</th>
                <th className="th">نام کامل</th>
                <th className="th">نقش</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {users.map((row) => (
                <tr key={row.id}>
                  <td className="td font-mono text-xs" dir="ltr">
                    {row.username}
                  </td>
                  <td className="td">{row.fullName}</td>
                  <td className="td">
                    <Badge tone={row.role === 'ADMIN' ? 'violet' : 'slate'}>
                      {row.role === 'ADMIN'
                        ? 'مدیر کل'
                        : row.role === 'EDITOR'
                          ? 'سازنده محتوا'
                          : 'داور'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={userOpen}
        onClose={() => setUserOpen(false)}
        title="کاربر جدید"
        footer={
          <>
            <Button variant="soft" onClick={() => setUserOpen(false)}>
              انصراف
            </Button>
            <Button onClick={() => void createUser()} disabled={busy}>
              ساخت کاربر
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>نام کاربری</Label>
            <Input
              value={userForm.username}
              onChange={(event) => setUserForm({ ...userForm, username: event.target.value })}
              dir="ltr"
              className="text-right"
            />
          </div>
          <div>
            <Label>نام کامل</Label>
            <Input
              value={userForm.fullName}
              onChange={(event) => setUserForm({ ...userForm, fullName: event.target.value })}
            />
          </div>
          <div>
            <Label hint="(اختیاری)">ایمیل</Label>
            <Input
              value={userForm.email}
              onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
              dir="ltr"
              className="text-right"
            />
          </div>
          <div>
            <Label>رمز عبور</Label>
            <Input
              type="password"
              value={userForm.password}
              onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
              dir="ltr"
              className="text-right"
            />
          </div>
          <div>
            <Label>نقش</Label>
            <select
              className="field"
              value={userForm.role}
              onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
            >
              <option value="ADMIN">مدیر کل</option>
              <option value="EDITOR">سازنده محتوا</option>
              <option value="REVIEWER">داور</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
