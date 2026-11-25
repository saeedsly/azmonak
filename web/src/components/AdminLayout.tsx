import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useBranding } from '../lib/settings';

const NAV = [
  { to: '/admin', label: 'داشبورد', icon: '📊', end: true },
  { to: '/admin/exams', label: 'آزمون‌ها و نظرسنجی‌ها', icon: '📝', end: false },
  { to: '/admin/courses', label: 'دوره‌ها', icon: '📚', end: false },
  { to: '/admin/attempts', label: 'پاسخ‌ها و داوری', icon: '✅', end: false },
  { to: '/admin/settings', label: 'تنظیمات', icon: '⚙️', end: false },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const branding = useBranding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-ink-600 hover:bg-ink-100 hover:text-brand-700'
            }`
          }
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      {/* سایدبار دسکتاپ */}
      <aside className="hidden w-72 shrink-0 border-l border-ink-200 bg-white/80 p-5 lg:block">
        <Link to="/admin" className="mb-6 flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl font-black text-white">
            ا
          </span>
          <span>
            <span className="block text-base font-extrabold text-ink-900">{branding.appName}</span>
            <span className="block text-[11px] text-ink-400">پنل مدیریت</span>
          </span>
        </Link>
        {nav}
        <div className="mt-6 rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
          <p className="text-sm font-bold text-ink-800">{user?.fullName}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">@{user?.username}</p>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="btn-soft mt-3 w-full text-xs"
          >
            خروج از حساب
          </button>
        </div>
      </aside>

      {/* سایدبار موبایل */}
      {open ? (
        <div className="fixed inset-0 z-50 bg-ink-900/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside
            className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="mb-5 text-base font-extrabold text-ink-900">منو</p>
            {nav}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink-200/70 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-soft px-3 py-2 text-sm"
            aria-label="منو"
          >
            ☰
          </button>
          <span className="text-sm font-bold text-ink-800">{branding.appName}</span>
          <Link to="/" className="text-xs text-ink-500">
            صفحه‌ی اصلی
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
