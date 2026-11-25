import { Link, Outlet } from 'react-router-dom';
import { useBranding } from '../lib/settings';

export function PublicLayout() {
  const branding = useBranding();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="" className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-black text-white">
                ا
              </span>
            )}
            <span className="text-lg font-extrabold text-ink-900">{branding.appName}</span>
          </Link>
          <Link
            to="/login"
            className="rounded-xl px-3 py-2 text-xs font-medium text-ink-500 transition hover:bg-ink-100 hover:text-brand-700"
          >
            ورود مدیران
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-ink-200/70 bg-white/70">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 text-center">
          <p className="text-xs text-ink-500">{branding.tagline}</p>
          {branding.supportText ? (
            <p className="mt-1 text-[11px] text-ink-400">{branding.supportText}</p>
          ) : null}
          {branding.footerText ? (
            <p className="mt-2 text-[11px] text-ink-400">{branding.footerText}</p>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
