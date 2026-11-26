# مرجع API

پایه‌ی همه‌ی مسیرها: `/api` · پاسخ‌ها JSON با کدگذاری UTF-8 هستند.
احراز هویت مدیر با هدر `Authorization: Bearer <token>` یا کوکی `azm_session`.
احراز هویت تلاش فراگیر با هدر `X-Attempt-Token: <token>`.

---

## عمومی (فراگیر) — `/api/public`

| متد | مسیر | کار | نیاز به احراز هویت |
|---|---|---|---|
| GET | `/settings` | نام برنامه و تنظیمات عمومی | ❌ |
| POST | `/resolve` | بررسی کد دسترسی → اطلاعات آزمون | ❌ |
| POST | `/attempts` | شروع تلاش (ساخت attempt + توکن) | ❌ |
| GET | `/attempts/:id` | وضعیت تلاش + سوال‌ها (بدون کلید پاسخ) | توکن تلاش |
| PUT | `/attempts/:id/answers/:questionId` | ذخیره‌ی یک پاسخ (autosave) | توکن تلاش |
| POST | `/attempts/:id/submit` | ثبت نهایی و محاسبه‌ی نمره | توکن تلاش |
| GET | `/attempts/:id/result` | نتیجه‌ی نهایی | توکن تلاش |

### نمونه‌ها

```bash
# ۱) بررسی کد
curl -X POST http://localhost:4000/api/public/resolve \
  -H 'Content-Type: application/json' \
  -d '{"code":"AZM-LVFR"}'
```
```json
{
  "exam": {
    "id": "…", "title": "آزمون پایانی دوره‌ی شبکه", "type": "EXAM",
    "durationMinutes": 45, "questionCount": 5, "totalPoints": 11,
    "passScore": 60, "requires": { "name": true, "email": false, … },
    "allowAnonymous": false, "startAt": null, "endAt": null
  }
}
```

```bash
# ۲) شروع تلاش
curl -X POST http://localhost:4000/api/public/attempts \
  -H 'Content-Type: application/json' \
  -d '{"accessCode":"AZM-LVFR","name":"زهرا محمدی","email":"z@example.com"}'
```
```json
{ "attemptId": "…", "token": "eyJ…", "expiresAt": 1795649982081, "durationMinutes": 45 }
```

```bash
# ۳) ذخیره پاسخ
curl -X PUT http://localhost:4000/api/public/attempts/<attemptId>/answers/<questionId> \
  -H 'Content-Type: application/json' -H 'X-Attempt-Token: <token>' \
  -d '{"value":"<optionId>"}'
```

```bash
# ۴) ثبت نهایی
curl -X POST http://localhost:4000/api/public/attempts/<attemptId>/submit \
  -H 'X-Attempt-Token: <token>'
```
```json
{ "result": { "score": 8, "maxScore": 11, "percent": 72.7, "passed": true, "status": "GRADED", … } }
```

---

## احراز هویت — `/api/auth`

| متد | مسیر | کار |
|---|---|---|
| POST | `/login` | ورود با نام کاربری و رمز → `{token, user}` |
| POST | `/logout` | خروج (پاک کردن کوکی) |
| GET | `/me` | کاربر جاری |
| POST | `/change-password` | تغییر رمز (رمز فعلی + رمز جدید) |

---

## مدیریت — `/api/admin` (نیازمند نشست مدیر)

### دوره‌ها — `/api/admin/courses`
| متد | مسیر | کار |
|---|---|---|
| GET | `/` | فهرست دوره‌ها (فیلتر جستجو/صفحه‌بندی) |
| POST | `/` | ساخت دوره |
| GET | `/:id` | جزئیات دوره |
| PATCH | `/:id` | ویرایش جزئی |
| DELETE | `/:id` | حذف |
| POST | `/:id/duplicate` | کپی دوره |

### آزمون‌ها — `/api/admin/exams`
| متد | مسیر | کار |
|---|---|---|
| GET | `/` | فهرست آزمون‌ها (فیلتر: `search`, `courseId`, `status`, `type`) |
| POST | `/` | ساخت آزمون/نظرسنجی (کد دسترسی خودکار) |
| GET | `/:id` | جزئیات + تعداد سوال/تلاش/میانگین |
| PATCH | `/:id` | ویرایش جزئی (فقط فیلدهای ارسال‌شده) |
| DELETE | `/:id` | حذف (با سوال‌ها و تلاش‌ها) |
| POST | `/:id/duplicate` | کپی آزمون با سوال‌ها |
| POST | `/:id/regenerate-code` | ساخت کد دسترسی جدید |
| GET | `/:id/questions` | سوال‌های آزمون |
| POST | `/:id/questions` | افزودن گروهی سوال (`{questions:[…]}`) |
| POST | `/:id/questions/reorder` | تغییر ترتیب سوال‌ها |
| GET | `/:id/invites` | کدهای اختصاصی |
| POST | `/:id/invites` | ساخت کد اختصاصی |

### سوال‌ها — `/api/admin/questions`
| متد | مسیر | کار |
|---|---|---|
| PATCH | `/:id` | ویرایش سوال |
| DELETE | `/:id` | حذف سوال |

### تلاش‌ها و داوری — `/api/admin/attempts`
| متد | مسیر | کار |
|---|---|---|
| GET | `/` | فهرست تلاش‌ها (فیلتر: `examId`, `status`, `search`) |
| GET | `/:id` | جزئیات تلاش |
| GET | `/:id/answers` | پاسخ‌ها (برای داوری) |
| POST | `/:id/grade` | ثبت نمره و بازخورد یک پاسخ |
| POST | `/:id/grade-bulk` | ثبت گروهی نمرات |
| POST | `/:id/finalize` | نهایی‌سازی (محاسبه‌ی نمره‌ی نهایی فراگیر) |

### نتایج — `/api/admin/results`
| متد | مسیر | کار |
|---|---|---|
| GET | `/exams/:id/analytics` | تحلیل کلی + سوال‌به‌سوال |
| GET | `/exams/:id/survey-results` | نتایج تجمیعی نظرسنجی |
| GET | `/exams/:id/export.csv` | خروجی Excel (CSV با UTF-8 BOM) |

### هوش مصنوعی — `/api/admin/ai`
| متد | مسیر | کار |
|---|---|---|
| GET | `/status` | وضعیت provider و پیام |
| GET | `/jobs` | تاریخچه‌ی کارهای AI |
| POST | `/extract` | استخراج سوال از عکس/PDF (multipart) |
| POST | `/extract/save` | ذخیره‌ی سوال‌های استخراج‌شده در آزمون |
| POST | `/generate` | تولید سوال با موضوع دلخواه |
| POST | `/grade` | پیشنهاد نمره برای پاسخ تشریحی |
| POST | `/summarize` | خلاصه‌سازی نتایج نظرسنجی |

### آپلود — `/api/admin/uploads`
| متد | مسیر | کار |
|---|---|---|
| POST | `/` | آپلود فایل (تصویر سوال، فایل پاسخ) → `{url}` |

### سیستم — `/api/admin/system`
| متد | مسیر | کار |
|---|---|---|
| GET | `/overview` | آمار داشبورد |
| GET | `/settings` | تنظیمات ذخیره‌شده‌ی برنامه |
| PUT | `/settings` | ذخیره‌ی تنظیمات |
| GET | `/users` | فهرست کاربران |
| POST | `/users` | ساخت کاربر |
| PATCH | `/users/:id` | ویرایش کاربر (نقش/فعال/رمز) |

---

## سلامت — `/api/health`

```json
{ "ok": true, "app": "ازمونک", "db": "sqlite", "time": 1795649695712 }
```

---

## کدهای خطا

| کد | معنی |
|---|---|
| `VALIDATION` | داده‌ی ارسالی معتبر نیست (پیام هر فیلد در `details`) |
| `UNAUTHORIZED` | باید وارد شوید / توکن نامعتبر یا منقضی |
| `FORBIDDEN` | دسترسی کافی نیست (یا آزمون منتشر نشده / سقف تلاش) |
| `NOT_FOUND` | مورد یافت نشد |
| `CONFLICT` | تکراری (مثلاً کد تکراری) |
| `RATE_LIMITED` | تعداد درخواست‌ها زیاد است |

> همه‌ی خطاها پیام فارسی دارند: `{ "error": "…", "code": "…" }`
