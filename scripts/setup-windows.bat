@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0.."

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

echo [۱/۵] نسخه‌ی Node.js: 
node -v
echo [۲/۵] نسخه‌ی npm:
call npm -v
echo.

echo [۳/۵] نصب کتابخانه‌ها (ممکن است چند دقیقه طول بکشد)...
call npm install
if errorlevel 1 (
  echo [خطا] نصب کتابخانه‌ها ناموفق بود.
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo [۴/۵] فایل .env از روی نمونه ساخته شد.
) else (
  echo [۴/۵] فایل .env از قبل وجود دارد (بدون تغییر).
)

echo [۵/۵] ساخت نسخه‌ی نهایی برنامه...
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
echo    ۱) فایل .env را باز کنید و تنظیمات MySQL و
echo       کلید هوش مصنوعی (ANTHROPIC_API_KEY) را وارد کنید.
echo    ۲) برای ساخت داده‌ی اولیه (کاربر مدیر و نمونه) اجرا کنید:
echo         npm run seed
echo    ۳) برنامه را اجرا کنید:
echo         scripts\start-windows.bat
echo ============================================
pause
