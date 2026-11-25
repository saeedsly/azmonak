@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0.."

if not exist ".env" (
  echo [خطا] فایل .env پیدا نشد. ابتدا scripts\setup-windows.bat را اجرا کنید.
  pause
  exit /b 1
)

if not exist "web\dist\index.html" (
  echo [اطلاع] نسخه‌ی نهایی ساخته نشده؛ در حال ساخت...
  call npm run build
  if errorlevel 1 (
    echo [خطا] ساخت برنامه ناموفق بود.
    pause
    exit /b 1
  )
)

echo ============================================
echo    ازمونک در حال اجرا است.
echo    صفحه‌ی فراگیر: http://localhost:4000/
echo    پنل مدیریت : http://localhost:4000/admin
echo    برای توقف: Ctrl+C
echo ============================================
echo.
node server\dist\index.js
pause
