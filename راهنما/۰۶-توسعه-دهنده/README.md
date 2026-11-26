# ۰۶ — راهنمای توسعه‌دهنده

| فایل | موضوع |
|---|---|
| [`محیط-توسعه.md`](محیط-توسعه.md) | راه‌اندازی محیط توسعه، دستورها، تست و استقرار |
| [`مرجع-api.md`](مرجع-api.md) | فهرست کامل مسیرهای API با نمونه‌ی درخواست/پاسخ |

---

## دستورهای پرکاربرد

```bash
npm install          # نصب همه‌ی workspace‌ها
npm run dev          # سرور API با hot-reload  → http://localhost:4000
npm run dev:web      # رابط کاربری با Vite        → http://localhost:5173
npm run build        # ساخت shared + server + web
npm run typecheck    # بررسی تایپ هر سه بخش
npm run seed         # کاربر مدیر + داده‌ی نمونه
npm run test:api     # تست API (سرور باید بالا باشد)
npm run check:sql    :: نمایش SQL تولیدشده برای MySQL
npm run release      # ساخت بسته‌ی ZIP
```

> `npm run dev:web` به‌صورت خودکار به `http://localhost:4000` پروکسی می‌کند؛
> کافی است هر دو سرور را هم‌زمان اجرا کنید.
