@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo ساخت بسته‌ی قابل توزیع ازمونک...
node scripts\build-release.mjs
if errorlevel 1 (
  echo [خطا] ساخت بسته ناموفق بود.
  pause
  exit /b 1
)
echo.
echo فایل بسته در پوشه‌ی release قرار گرفت.
pause
