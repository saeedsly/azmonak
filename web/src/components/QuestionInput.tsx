import { useRef, useState } from 'react';
import type { PublicQuestionDto } from '@azmoonak/shared';
import { Input, Label, Textarea } from './ui';

export interface QuestionAnswerProps {
  question: PublicQuestionDto;
  value: unknown;
  onChange: (value: unknown) => void;
  readOnly?: boolean;
  onUpload?: (file: File) => Promise<string | null>;
}

export function QuestionInput({
  question,
  value,
  onChange,
  readOnly = false,
  onUpload,
}: QuestionAnswerProps) {
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE':
      return (
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const active = value === option.id;
            return (
              <button
                type="button"
                key={option.id}
                disabled={readOnly}
                onClick={() => onChange(option.id)}
                className={`option-row w-full text-right ${active ? 'option-row-active' : ''} ${
                  readOnly ? 'cursor-default opacity-80' : ''
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 text-[10px] ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-300 text-transparent'
                  }`}
                  style={{ borderRadius: question.type === 'TRUE_FALSE' ? '999px' : '6px' }}
                >
                  ●
                </span>
                <span className="text-sm leading-7 text-ink-700">{option.text}</span>
              </button>
            );
          })}
        </div>
      );

    case 'MULTIPLE_SELECT': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const active = selected.includes(option.id);
            return (
              <button
                type="button"
                key={option.id}
                disabled={readOnly}
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((item) => item !== option.id)
                      : [...selected, option.id],
                  )
                }
                className={`option-row w-full text-right ${active ? 'option-row-active' : ''} ${
                  readOnly ? 'cursor-default opacity-80' : ''
                }`}
              >
                <span
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center border-2 text-[10px] ${
                    active
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-ink-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="text-sm leading-7 text-ink-700">{option.text}</span>
              </button>
            );
          })}
        </div>
      );
    }

    case 'SHORT_TEXT':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          placeholder="پاسخ خود را بنویسید…"
          className="min-h-[90px]"
        />
      );

    case 'LONG_TEXT':
      return (
        <Textarea
          value={typeof value === 'string' ? value : ''}
          disabled={readOnly}
          onChange={(event) => onChange(event.target.value)}
          placeholder="پاسخ خود را بنویسید…"
          className="min-h-[180px]"
        />
      );

    case 'NUMBER': {
      const current =
        typeof value === 'object' && value !== null && 'text' in (value as Record<string, unknown>)
          ? String((value as Record<string, unknown>).text ?? '')
          : typeof value === 'number'
            ? String(value)
            : '';
      return (
        <Input
          value={current}
          disabled={readOnly}
          inputMode="decimal"
          dir="ltr"
          className="text-right"
          onChange={(event) => onChange({ text: event.target.value })}
          placeholder="عدد پاسخ را وارد کنید"
        />
      );
    }

    case 'RATING': {
      const config = question.ratingConfig ?? {
        min: 1,
        max: 5,
        step: 1,
        minLabel: '',
        maxLabel: '',
        allowText: true,
      };
      const current = typeof value === 'number' ? value : null;
      const text =
        typeof value === 'object' && value !== null && 'text' in (value as Record<string, unknown>)
          ? String((value as Record<string, unknown>).text ?? '')
          : '';
      const steps: number[] = [];
      for (let i = config.min; i <= config.max; i += Math.max(1, config.step)) steps.push(i);

      return (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {steps.map((step) => (
              <button
                type="button"
                key={step}
                disabled={readOnly}
                onClick={() => onChange({ rating: step, text })}
                className={`h-11 w-11 rounded-xl border text-sm font-bold transition ${
                  current === step
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-ink-200 bg-white text-ink-600 hover:border-brand-300'
                }`}
              >
                {step}
              </button>
            ))}
          </div>
          {config.minLabel || config.maxLabel ? (
            <div className="flex justify-between text-[11px] text-ink-400">
              <span>{config.minLabel}</span>
              <span>{config.maxLabel}</span>
            </div>
          ) : null}
          {config.allowText ? (
            <Textarea
              value={text}
              disabled={readOnly}
              onChange={(event) => onChange({ rating: current, text: event.target.value })}
              placeholder="توضیح اختیاری…"
              className="min-h-[80px]"
            />
          ) : null}
        </div>
      );
    }

    case 'MATRIX': {
      const config = question.matrixConfig;
      const answers =
        typeof value === 'object' && value !== null && !Array.isArray(value)
          ? (value as Record<string, string>)
          : {};
      if (!config) return null;
      return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold text-ink-500">مورد</th>
                {config.columns.map((column) => (
                  <th key={column.id} className="px-3 py-2 text-center text-xs font-semibold text-ink-500">
                    {column.text}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.rows.map((row) => (
                <tr key={row.id} className="border-t border-ink-100">
                  <td className="px-3 py-2.5 text-right text-xs text-ink-700">{row.text}</td>
                  {config.columns.map((column) => (
                    <td key={column.id} className="px-3 py-2.5 text-center">
                      <input
                        type="radio"
                        name={`matrix-${question.id}-${row.id}`}
                        disabled={readOnly}
                        checked={answers[row.id] === column.id}
                        onChange={() => onChange({ ...answers, [row.id]: column.id })}
                        className="h-4 w-4 accent-brand-600"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'FILE_UPLOAD':
      return (
        <FileUpload
          value={typeof value === 'string' ? value : ''}
          readOnly={readOnly}
          onUpload={onUpload}
          onChange={onChange}
        />
      );

    default:
      return null;
  }
}

function FileUpload({
  value,
  readOnly,
  onUpload,
  onChange,
}: {
  value: string;
  readOnly: boolean;
  onUpload?: (file: File) => Promise<string | null>;
  onChange: (value: unknown) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="rounded-xl border border-dashed border-ink-300 bg-ink-50/60 p-4">
      {value ? (
        <div className="flex items-center justify-between gap-3">
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="truncate text-xs font-medium text-brand-700 underline"
          >
            فایل بارگذاری‌شده
          </a>
          {!readOnly ? (
            <button
              type="button"
              className="btn-ghost text-xs"
              onClick={() => onChange('')}
            >
              حذف
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <Label>بارگذاری فایل پاسخ (PDF یا تصویر)</Label>
          <input
            ref={inputRef}
            type="file"
            disabled={readOnly || busy}
            accept=".pdf,image/*"
            className="field"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file || !onUpload) return;
              setBusy(true);
              const url = await onUpload(file);
              setBusy(false);
              if (url) onChange(url);
            }}
          />
          {busy ? <p className="mt-2 text-[11px] text-ink-500">در حال بارگذاری…</p> : null}
        </>
      )}
    </div>
  );
}
