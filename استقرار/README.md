# پوشه‌ی «استقرار» — فایل‌های آماده

هر چیزی که برای **اجرای دائمی و حرفه‌ای** لازم دارید، اینجا آماده است.

| مسیر | فایل | کار |
|---|---|---|
| `nginx/` | `azmoonak.conf` | پیکربندی Nginx (پروکسی + HTTPS با certbot) |
| `systemd/` | `azmoonak.service` | سرویس لینوکس برای اجرای دائمی |
| `xampp/` | `httpd-vhosts.conf` | دامنه‌ی داخلی روی XAMPP/Apache |
| `xampp/` | `README.md` | نکته‌های کاربردی XAMPP |
| `docker/` | `Dockerfile` | ایمیج Docker برنامه |
| `docker/` | `docker-compose.prod.yml` | برنامه + MySQL + سرویس پشتیبان‌گیری |
| `windows/` | `backup-mysql.bat` | پشتیبان‌گیری روزانه با یک دابل‌کلیک |
| `windows/` | `backup-mysql.ps1` | همان کار برای Task Scheduler (پیشنهادی) |
| `windows/` | `restore-mysql.bat` | بازیابی از فایل پشتیبان |

---

## انتخاب سریع

| شما این را دارید | از این استفاده کنید |
|---|---|
| ویندوز + XAMPP | `windows/backup-mysql.ps1` + Task Scheduler |
| لینوکس (سرور) | `systemd/azmoonak.service` + `nginx/azmoonak.conf` |
| سرور ابری / کانتینر | `docker/docker-compose.prod.yml` |

راهنمای کامل هر روش:
[`راهنما/۰۷-استقرار-و-سرویس-دائمی/`](../راهنما/۰۷-استقرار-و-سرویس-دائمی/)

> ⚠️ قبل از پشتیبان‌گیری، رمزهای داخل این فایل‌ها (`Azmoonak@123`) را با رمز واقعی خود
> جایگزین کنید.
