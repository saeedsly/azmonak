# XAMPP — نکته‌های کاربردی

| موضوع | راه‌حل |
|---|---|
| MySQL خودبه‌خود بالا نمی‌آید | XAMPP را با **Run as administrator** باز کنید → MySQL → **Service → Install** → **Start** |
| پورت ۳۳۰۶ اشغال است | در `C:\xampp\mysql\bin\my.ini` مقدار `port=3307` را ست کنید و `MYSQL_URL` را هماهنگ کنید |
| phpMyAdmin باز نمی‌شود | Apache را Start کنید؛ آدرس: <http://localhost/phpmyadmin> |
| دامنه‌ی داخلی | `httpd-vhosts.conf` (همین پوشه) + `hosts` |
| پورت ۸۰ اشغال است (IIS/Skype) | در `httpd.conf` مقدار `Listen 8080` را بگذارید و آدرس را `http://localhost:8080` کنید |

## ساخت دیتابیس (کپی‌-پیست در phpMyAdmin → تب SQL)

```sql
CREATE DATABASE azmoonak CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'azmoonak'@'localhost' IDENTIFIED BY 'Azmoonak@123';
GRANT ALL PRIVILEGES ON azmoonak.* TO 'azmoonak'@'localhost';
FLUSH PRIVILEGES;
```

## پشتیبان‌گیری از phpMyAdmin
۱) دیتابیس `azmoonak` → تب **Export** → **Quick** → SQL → **Go**
۲) فایل `.sql` را در جای امن نگه دارید.

> برای پشتیبان‌گیری خودکار روزانه از خط فرمان →
> [`استقرار/windows/backup-mysql.bat`](../windows/backup-mysql.bat)
