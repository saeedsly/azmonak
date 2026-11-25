import { useState } from 'react';
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from '@azmoonak/shared';
import { Button, Input, Label, Select, Textarea, Toggle } from './ui';
import { api } from '../lib/api';

export interface OptionDraft {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionDraft {
  type: QuestionType;
  title: string;
  description: string;
  imageUrl: string;
  points: number;
  explanation: string;
  difficulty: number;
  tags: string[];
  isRequired: boolean;
  allowPartialCredit: boolean;
  options: OptionDraft[];
  matrixConfig: {
    rows: Array<{ id: string; text: string }>;
    columns: Array<{ id: string; text: string }>;
    correct: Record<string, string[]>;
  } | null;
  ratingConfig: {
    min: number;
    max: number;
    step: number;
    minLabel: string;
    maxLabel: string;
    allowText: boolean;
  } | null;
}

export function emptyQuestion(): QuestionDraft {
  return {
    type: 'MULTIPLE_CHOICE',
    title: '',
    description: '',
    imageUrl: '',
    points: 1,
    explanation: '',
    difficulty: 3,
    tags: [],
    isRequired: true,
    allowPartialCredit: false,
    options: [
      { id: '', text: '', isCorrect: true, order: 0 },
      { id: '', text: '', isCorrect: false, order: 1 },
      { id: '', text: '', isCorrect: false, order: 2 },
      { id: '', text: '', isCorrect: false, order: 3 },
    ],
    matrixConfig: null,
    ratingConfig: null,
  };
}

const HAS_OPTIONS: QuestionType[] = ['MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE'];

export function QuestionForm({
  value,
  onChange,
}: {
  value: QuestionDraft;
  onChange: (next: QuestionDraft) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const patch = (part: Partial<QuestionDraft>) => onChange({ ...value, ...part });

  const changeType = (type: QuestionType) => {
    const next: QuestionDraft = { ...value, type };
    if (type === 'TRUE_FALSE') {
      next.options = [
        { id: '', text: 'صحیح', isCorrect: true, order: 0 },
        { id: '', text: 'نادرست', isCorrect: false, order: 1 },
      ];
    } else if (type === 'RATING' && !value.ratingConfig) {
      next.ratingConfig = {
        min: 1,
        max: 5,
        step: 1,
        minLabel: 'خیلی ضعیف',
        maxLabel: 'عالی',
        allowText: true,
      };
    } else if (type === 'MATRIX' && !value.matrixConfig) {
      next.matrixConfig = {
        rows: [{ id: 'r1', text: '' }],
        columns: [
          { id: 'c1', text: 'کم' },
          { id: 'c2', text: 'متوسط' },
          { id: 'c3', text: 'زیاد' },
        ],
        correct: {},
      };
    }
    patch(next);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await api.upload<{ url: string }>('/admin/uploads', formData);
      patch({ imageUrl: result.url });
    } catch {
      /* بی‌اهمیت */
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>نوع سوال</Label>
          <Select value={value.type} onChange={(event) => changeType(event.target.value as QuestionType)}>
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {QUESTION_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label hint="(عدد)">بارم سوال</Label>
          <Input
            type="number"
            min={0}
            step={0.5}
            value={value.points}
            onChange={(event) => patch({ points: Number(event.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label>متن سوال</Label>
        <Textarea
          value={value.title}
          onChange={(event) => patch({ title: event.target.value })}
          placeholder="متن سوال را بنویسید…"
          className="min-h-[110px]"
        />
      </div>

      <div>
        <Label hint="(اختیاری)">توضیح / زمینه</Label>
        <Input
          value={value.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label hint="(اختیاری)">تصویر سوال</Label>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              className="field"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadImage(file);
              }}
            />
            {value.imageUrl ? (
              <img src={value.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" />
            ) : null}
          </div>
          {uploading ? <p className="mt-1 text-[11px] text-ink-500">در حال بارگذاری…</p> : null}
        </div>
        <div>
          <Label hint="(۱ تا ۵)">سطح دشواری</Label>
          <Input
            type="number"
            min={1}
            max={5}
            value={value.difficulty}
            onChange={(event) => patch({ difficulty: Number(event.target.value) })}
          />
        </div>
      </div>

      {HAS_OPTIONS.includes(value.type) ? (
        <div>
          <Label>
            گزینه‌ها{' '}
            {value.type === 'MULTIPLE_CHOICE' ? (
              <span className="text-[11px] text-ink-400">(فقط یک گزینه درست)</span>
            ) : value.type === 'MULTIPLE_SELECT' ? (
              <span className="text-[11px] text-ink-400">(می‌توانید چند گزینه درست انتخاب کنید)</span>
            ) : null}
          </Label>
          <div className="space-y-2">
            {value.options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type={value.type === 'MULTIPLE_SELECT' ? 'checkbox' : 'radio'}
                  checked={option.isCorrect}
                  onChange={() => {
                    const options = value.options.map((item, i) => ({
                      ...item,
                      isCorrect:
                        value.type === 'MULTIPLE_SELECT'
                          ? i === index
                            ? !item.isCorrect
                            : item.isCorrect
                          : i === index,
                    }));
                    patch({ options });
                  }}
                  className="h-4 w-4 shrink-0 accent-brand-600"
                />
                <Input
                  value={option.text}
                  onChange={(event) => {
                    const options = value.options.map((item, i) =>
                      i === index ? { ...item, text: event.target.value } : item,
                    );
                    patch({ options });
                  }}
                  placeholder={`گزینه‌ی ${index + 1}`}
                />
                {value.options.length > 2 ? (
                  <button
                    type="button"
                    className="btn-ghost shrink-0 text-rose-600"
                    onClick={() =>
                      patch({
                        options: value.options.filter((_, i) => i !== index),
                      })
                    }
                  >
                    ✕
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <Button
            variant="soft"
            className="mt-2 text-xs"
            onClick={() =>
              patch({
                options: [
                  ...value.options,
                  { id: '', text: '', isCorrect: false, order: value.options.length },
                ],
              })
            }
          >
            + افزودن گزینه
          </Button>
        </div>
      ) : null}

      {value.type === 'RATING' && value.ratingConfig ? (
        <div className="rounded-xl border border-ink-200 p-4">
          <p className="mb-3 text-xs font-bold text-ink-700">تنظیمات طیف لیکرت</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label>از</Label>
              <Input
                type="number"
                min={0}
                value={value.ratingConfig.min}
                onChange={(event) =>
                  patch({
                    ratingConfig: { ...value.ratingConfig!, min: Number(event.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label>تا</Label>
              <Input
                type="number"
                min={1}
                value={value.ratingConfig.max}
                onChange={(event) =>
                  patch({
                    ratingConfig: { ...value.ratingConfig!, max: Number(event.target.value) },
                  })
                }
              />
            </div>
            <div>
              <Label>برچسب کم</Label>
              <Input
                value={value.ratingConfig.minLabel}
                onChange={(event) =>
                  patch({
                    ratingConfig: { ...value.ratingConfig!, minLabel: event.target.value },
                  })
                }
              />
            </div>
            <div>
              <Label>برچسب زیاد</Label>
              <Input
                value={value.ratingConfig.maxLabel}
                onChange={(event) =>
                  patch({
                    ratingConfig: { ...value.ratingConfig!, maxLabel: event.target.value },
                  })
                }
              />
            </div>
          </div>
          <div className="mt-3">
            <Toggle
              checked={value.ratingConfig.allowText}
              onChange={(checked) =>
                patch({ ratingConfig: { ...value.ratingConfig!, allowText: checked } })
              }
              label="امکان نوشتن توضیح"
            />
          </div>
        </div>
      ) : null}

      {value.type === 'MATRIX' && value.matrixConfig ? (
        <div className="rounded-xl border border-ink-200 p-4">
          <p className="mb-3 text-xs font-bold text-ink-700">سطرها و ستون‌های ماتریس</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>سطرها</Label>
              <div className="space-y-2">
                {value.matrixConfig.rows.map((row, index) => (
                  <Input
                    key={row.id}
                    value={row.text}
                    onChange={(event) => {
                      const rows = value.matrixConfig!.rows.map((item, i) =>
                        i === index ? { ...item, text: event.target.value } : item,
                      );
                      patch({ matrixConfig: { ...value.matrixConfig!, rows } });
                    }}
                    placeholder={`سطر ${index + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="soft"
                className="mt-2 text-xs"
                onClick={() =>
                  patch({
                    matrixConfig: {
                      ...value.matrixConfig!,
                      rows: [
                        ...value.matrixConfig!.rows,
                        { id: `r${Date.now()}`, text: '' },
                      ],
                    },
                  })
                }
              >
                + سطر
              </Button>
            </div>
            <div>
              <Label>ستون‌ها</Label>
              <div className="space-y-2">
                {value.matrixConfig.columns.map((column, index) => (
                  <Input
                    key={column.id}
                    value={column.text}
                    onChange={(event) => {
                      const columns = value.matrixConfig!.columns.map((item, i) =>
                        i === index ? { ...item, text: event.target.value } : item,
                      );
                      patch({ matrixConfig: { ...value.matrixConfig!, columns } });
                    }}
                    placeholder={`ستون ${index + 1}`}
                  />
                ))}
              </div>
              <Button
                variant="soft"
                className="mt-2 text-xs"
                onClick={() =>
                  patch({
                    matrixConfig: {
                      ...value.matrixConfig!,
                      columns: [
                        ...value.matrixConfig!.columns,
                        { id: `c${Date.now()}`, text: '' },
                      ],
                    },
                  })
                }
              >
                + ستون
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <Label hint="(اختیاری، بعد از آزمون به فراگیر نشان داده می‌شود)">پاسخ تشریحی</Label>
        <Textarea
          value={value.explanation}
          onChange={(event) => patch({ explanation: event.target.value })}
          placeholder="دلیل پاسخ درست…"
          className="min-h-[90px]"
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Toggle
          checked={value.isRequired}
          onChange={(checked) => patch({ isRequired: checked })}
          label="پاسخ این سوال اجباری است"
        />
        {value.type === 'MULTIPLE_SELECT' ? (
          <Toggle
            checked={value.allowPartialCredit}
            onChange={(checked) => patch({ allowPartialCredit: checked })}
            label="نمره‌ی جزئی برای پاسخ ناقص"
            description="پاسخ‌های درستِ بیشتر، نمره‌ی بیشتری می‌گیرد"
          />
        ) : null}
      </div>
    </div>
  );
}
