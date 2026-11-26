# استقرار روی لینوکس (systemd + Nginx + HTTPS)

مناسب برای سرور ابری یا لینوکس مدرسه/شرکت. نمونه‌ی فایل‌ها در
[`استقرار/`](../../استقرار/) آماده است.

---

## ۱) پیش‌نیازها

```bash
sudo apt update
sudo apt install -y nodejs npm mysql-server nginx
```

> Node.js نسخه‌ی ۲۰+ لازم است. در Ubuntu 22 به بعد `nodejs` در مخزن رسمی موجود است؛ برای
> نسخه‌های جدیدتر از [NodeSource](https://github.com/nodesource/distributions) استفاده کنید.

---

## ۲) کپی پروژه و ساخت

```bash
sudo mkdir -p /opt/azmoonak
sudo cp -r . /opt/azmoonak
cd /opt/azmoonak
sudo npm ci
sudo npm run build
```

## ۳) تنظیمات

```bash
sudo cp .env.example .env
sudo nano .env
```
```ini
NODE_ENV=production
HOST=127.0.0.1          # Nginx پروکسی می‌کند؛ نیازی به باز بودن مستقیم نیست
PORT=4000
APP_URL=https://azmoonak.example.ir
SESSION_SECRET=<یک-رشته-تصادفی-بلند>
DB_MODE=mysql
MYSQL_URL=mysql://azmoonak:Azmoonak@123@127.0.0.1:3306/azmoonak
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
```

```bash
sudo chown -R azmoonak:azmoonak /opt/azmoonak
```

## ۴) سرویس systemd

```bash
sudo cp /opt/azmoonak/استقرار/systemd/azmoonak.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now azmoonak
sudo systemctl status azmoonak
```

> فایل سرویس در `استقرار/systemd/azmoonak.service` آماده است (کاربر `azmoonak` را می‌سازد).

## ۵) Nginx + دامنه

```bash
sudo cp /opt/azmoonak/استقرار/nginx/azmoonak.conf /etc/nginx/sites-available/azmoonak
sudo ln -s /etc/nginx/sites-available/azmoonak /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

سپس برای HTTPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d azmoonak.example.ir
```

> ⚠️ بعد از فعال شدن HTTPS، `APP_URL` را به `https://…` تغییر دهید و سرویس را ری‌استارت کنید.

## ۶) بررسی

```bash
curl http://127.0.0.1:4000/api/health
curl -I https://azmoonak.example.ir/
sudo journalctl -u azmoonak -f     # لاگ زنده
```

---

## 🐳 Docker (جایگزین سریع)

```bash
cd /opt/azmoonak
cp .env.example .env && nano .env     # DB_MODE=mysql و MYSQL_URL داکری
docker compose -f استقرار/docker/docker-compose.prod.yml up -d
```

| سرویس | توضیح |
|---|---|
| `app` | خود برنامه (Node 22 alpine) روی پورت ۴۰۰۰ |
| `mysql` | MySQL 8.4 با volume دائمی |
| `backup` | سرویس پس‌زمینه‌ی پشتیبان‌گیری روزانه (cron داخل کانتینر) |
