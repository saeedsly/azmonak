@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0.."

set "MODE=%~1"
if not "%MODE%"=="" set "MODE=%MODE:~0,6%"

echo ============================================
echo    ازمونک - راه‌اندازی اولیه روی ویندوز
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [خطا] Node.js نصب نیست است.
  echo لطفاً نسخه ۲۰ یا بالاتر را از nodejs.org نصب کنید و دوباره این فایل را اجرا کنید.
  pause
  exit /b 1
)

echo [۱/۶] نسخه‌ی Node.js:
node -v
echo [۲/۶] نسخه‌ی npm:
call npm -v
echo.

echo [۳/۶] نصب کتابخانه‌ها (ممکن است چند دقیقه طول بکشد)...
call npm install
if errorlevel 1 (
  echo [خطا] نصب کتابخانه‌ها ناموفق بود.
  pause
  exit /b 1
)

echo [۴/۶] بررسی درایور SQLite (اختیاری - فقط برای حالت بدون MySQL)...
node -e "require('better-sqlite3')" >nul 2>nul
if errorlevel 1 (
  echo [اطلاع] درایور SQLite نصب نشد؛ این مشکلی ایجاد نمی‌کند اگر از MySQL استفاده کنید.
  echo        برای فعال شدن حالت SQLite، دستور زیر را اجرا کنید:
  echo          npm install better-sqlite3
) else (
  echo [خوب] درایور SQLite آماده است.
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  if /i "%MODE%"=="sqlite" (
    powershell -NoProfile -Command "(Get-Content '.env') -replace '^DB_MODE=.*$','DB_MODE=sqlite' | Set-Content '.env'" >nul 2>nul
    echo [۵/۶] فایل .env ساخته شد (حالت SQLite - بدون نیاز به MySQL).
  ) else (
    echo [۵/۶] فایل .env از روی نمونه ساخته شد (حالت MySQL).
  )
) else (
  echo [۵/۶] فایل .env از قبل وجود دارد (بدون تغییر).
)

echo [۶/۶] ساخت نسخه‌ی نهایی برنامه...
call npm run build
if errorlevel 1 (
  echo [خطا] ساخت برنامه ناموفق بود.
  pause
  exit /b 1
)

echo.
echo ============================================
echo    نصب تمام شد.
echo.
echo    گام بعدی:
echo    ۱) برای داده‌ی اولیه (کاربر مدیر و نمونه) اجرا کنید:
echo         npm run seed
echo    ۲) برنامه را اجرا کنید:
echo         scripts\start-windows.bat
echo    ۳) سپس در مرورگر باز کنید:
echo         http://localhost:4000/admin  (پنل مدیریت)
echo         http://localhost:4000/       (ورود فراگیر)
echo ============================================
pause
