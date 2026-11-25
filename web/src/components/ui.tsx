import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useEffect } from 'react';

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
}) {
  const styles: Record<string, string> = {
    primary: 'btn-primary',
    soft: 'btn-soft',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  };
  return (
    <button className={`${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`field ${className}`} {...props} />;
}

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`field min-h-[110px] leading-7 ${className}`} {...props} />;
}

export function Select({
  className = '',
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`field ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <label className="label">
      {children}
      {hint ? <span className="ms-2 font-normal text-ink-400">{hint}</span> : null}
    </label>
  );
}

export function Card({
  title,
  description,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title ? <h2 className="text-base font-bold text-ink-900">{title}</h2> : null}
            {description ? (
              <p className="mt-1 text-xs leading-6 text-ink-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode;
  tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet';
}) {
  const tones: Record<string, string> = {
    slate: 'bg-ink-100 text-ink-600',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
    violet: 'bg-brand-50 text-brand-700',
  };
  return <span className={`badge ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-label="در حال بارگذاری"
    />
  );
}

export function Loading({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-ink-500">
      <Spinner className="text-brand-600" />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 bg-ink-50/60 px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl shadow-sm">
        📭
      </div>
      <h3 className="text-sm font-bold text-ink-800">{title}</h3>
      {description ? <p className="max-w-md text-xs leading-6 text-ink-500">{description}</p> : null}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-6 py-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl shadow-sm">
        ⚠️
      </div>
      <p className="max-w-md text-sm leading-7 text-rose-700">{message}</p>
      {onRetry ? (
        <Button variant="soft" onClick={onRetry}>
          تلاش دوباره
        </Button>
      ) : null}
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const widths = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
        role="presentation"
      />
      <div
        className={`animate-fade-up relative flex max-h-[92vh] w-full ${widths[size]} flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl`}
        role="dialog"
        aria-modal="true"
      >
        <header className="flex items-center justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <h3 className="text-sm font-bold text-ink-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="بستن"
          >
            ✕
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-ink-200 px-3.5 py-3 transition hover:border-brand-300">
      <span>
        <span className="block text-sm font-medium text-ink-700">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs leading-6 text-ink-400">{description}</span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
          checked ? 'bg-brand-600' : 'bg-ink-300'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? 'right-0.5' : 'right-5.5'
          }`}
          style={checked ? { right: 2 } : { right: 22 }}
        />
      </button>
    </label>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'brand',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'brand' | 'green' | 'amber' | 'rose' | 'sky';
}) {
  const tones: Record<string, string> = {
    brand: 'from-brand-500 to-brand-700',
    green: 'from-emerald-500 to-emerald-700',
    amber: 'from-amber-400 to-amber-600',
    rose: 'from-rose-500 to-rose-700',
    sky: 'from-sky-400 to-sky-600',
  };
  return (
    <div className="card overflow-hidden p-0">
      <div className={`h-1.5 w-full bg-gradient-to-l ${tones[tone]}`} />
      <div className="p-4">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-ink-900">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-ink-400">{hint}</p> : null}
      </div>
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  tone = 'brand',
}: {
  value: number;
  max?: number;
  tone?: 'brand' | 'green' | 'rose' | 'amber';
}) {
  const width = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const tones: Record<string, string> = {
    brand: 'bg-brand-500',
    green: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
      <div className={`h-full rounded-full ${tones[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function CodeBox({
  value,
  label = 'کد دسترسی',
  hint,
}: {
  value: string;
  label?: string;
  hint?: string;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* بی‌اهمیت */
    }
  };
  return (
    <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50/60 p-4 text-center">
      <p className="text-xs text-brand-600">{label}</p>
      <p className="my-2 font-mono text-2xl font-extrabold tracking-widest text-brand-800">
        {value}
      </p>
      {hint ? <p className="mb-2 text-[11px] text-ink-500">{hint}</p> : null}
      <button
        type="button"
        onClick={copy}
        className="btn-soft border-brand-200 bg-white text-xs text-brand-700"
      >
        کپی کد
      </button>
    </div>
  );
}
