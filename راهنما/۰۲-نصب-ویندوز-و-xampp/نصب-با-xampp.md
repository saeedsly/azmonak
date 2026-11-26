# نصب با XAMPP — گام‌به‌گام

XAMPP محبوب‌ترین راه برای داشتن **MySQL + phpMyAdmin** روی ویندوز بدون درگیرشدن با نصب‌کننده‌های
پیچیده است. ازمونک با **MySQL 8** و **MariaDB 10.4+** (که XAMPP معمولاً می‌آورد) کاملاً سازگار است.

---

## گام ۱ — نصب XAMPP

1. از <https://www.apachefriends.org/download.html> نسخه‌ی **Windows** را دانلود کنید.
2. نصب کنید؛ مسیر پیش‌فرض (`C:\xampp`) مشکلی ندارد.
3. XAMPP Control Panel را باز کنید و جلوی **MySQL** روی **Start** بزنید.
   - اگر پیام «port 3306 in use» دادید: در تنظیمات MySQL پورت را به `3307` تغییر دهید و
     در `.env` هم `MYSQL_URL` را با پورت جدید بنویسید.
4. جلوی **Apache** هم **Start** بزنید (برای phpMyAdmin لازم نیست ولی برای
   [پروکسی کردن آزمون روی دامنه][](https://httpd.apache.org/docs/2.4/proxy.html) مفید است).

## گام ۲ — ساخت دیتابیس

1. در مرورگر: <http://localhost/phpmyadmin>
2. تب **SQL** → کد زیر را اجرا کنید:

```sql
CREATE DATABASE azmoonak CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'azmoonak'@'localhost' IDENTIFIED BY 'Azmoonak@123';
GRANT ALL PRIVILEGES ON azmoonak.* TO 'azmoonak'@'localhost';
FLUSH PRIVILEGES;
```

3. برگردید به تب **User accounts** و مطمئن شوید کاربر `azmoonak` ساخته شده و
   از **localhost** اجازه‌ی ورود دارد.

## گام ۳ — تنظیم `.env`

```ini
DB_MODE=mysql
MYSQL_URL=mysql://azmoonak:Azmoonak@123@127.0.0.1:3306/azmoonak
```

## گام ۴ — نصب، ساخت و اجرا

```bat
scripts\setup-windows.bat
npm run seed
scripts\start-windows.bat
```

---

## 🛠 نکته‌های عملی XAMPP

| موضوع | راه‌حل |
|---|---|
| MySQL خودبه‌خود بالا نمی‌آید | XAMPP را با **Run as administrator** باز کنید و Service را در ویندوز ثبت کنید (MySQL → Service → Install) |
| پورت ۳۳۰۶ اشغال است | در `C:\xampp\mysql\bin\my.ini` مقدار `port=3307` را ست کنید و `MYSQL_URL` را هماهنگ کنید |
| می‌خواهم دیتابیس از بیرون هم دیده شود | در `my.ini` مقدار `bind-address=0.0.0.0` را ست کنید — ⚠️ فقط در شبکه‌ی قابل اعتماد |
| می‌خواهم پورت MySQL را از اینترنت ببندم | فایروال ویندوز: پورت ۳۳۰۶ را برای اینترنت مسدود کنید (برنامه فقط به 127.0.0.1 وصل می‌شود) |
| آیا Apache لازم است؟ | خیر؛ فقط برای phpMyAdmin و در صورت استفاده از دامنه‌ی داخلی لازم است |
| پشتیبان از دیتابیس | phpMyAdmin ← آزمون ← Export → فایل `.sql` |

---

## 🧩 ترکیب با دامنه‌ی داخلی (اختیاری)

اگر می‌خواهید آزمون‌ها با آدرسی مثل `http://azmoonak.local` باز شوند:

1. در `C:\xampp\apache\conf\extra\httpd-vhosts.conf` اضافه کنید:

```apache
<VirtualHost *:80>
    ServerName azmoonak.local
    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:4000/
    ProxyPassReverse / http://127.0.0.1:4000/
</VirtualHost>
```

2. در `C:\Windows\System32\drivers\etc\hosts` اضافه کنید:

```
127.0.0.1 azmoonak.local
```

3. Apache را ری‌استارت کنید و در `.env` مقدار `APP_URL=http://azmoonak.local` بگذارید.

> فایل نمونه‌ی این تنظیمات در پوشه‌ی [`استقرار/xampp/`](../../استقرار/xampp/) موجود است.
