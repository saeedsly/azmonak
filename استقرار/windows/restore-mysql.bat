@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0..\.."

REM ---------------------------------------------------------------------
REM  ازمونك - بازیابی از فایل پشتیبان SQL
REM  استفاده:
REM    استقرار\windows\restore-mysql.bat backups\azmoonak-2026-01-31_2300.sql
REM ---------------------------------------------------------------------

set "SQLFILE=%~1"
if "%SQLFILE%"=="" (
  echo [خطا] مسیر فایل پشتیبان را وارد کنید.
  echo نمونه:  استقرار\windows\restore-mysql.bat backups\azmoonak-2026-01-31_2300.sql
  pause
  exit /b 1
)

if not exist "%SQLFILE%" (
  echo [خطا] فایل پیدا نشد: %SQLFILE%
  pause
  exit /b 1
)

echo.
echo  هشدار: با بازیابی، داده‌های فعلی دیتابیس azmoonak جایگزین می‌شوند.
set /p CONFIRM=آیا مطمئن هستید؟ (yes/no):
if /i not "%CONFIRM%"=="yes" (
  echo لغو شد.
  pause
  exit /b 0
)

set "MYSQL="
for %%P in (mysql, mariadb) do (
  if not defined MYSQL (
    for /f "delims=" %%m in ('where %%P 2^>nul') do set "MYSQL=%%m"
  )
)

if not defined MYSQL (
  echo [خطا] mysql در PATH پیدا نشد. مسیر bin مربوط به XAMPP را به PATH اضافه کنید.
  pause
  exit /b 1
)

"%MYSQL%" -u azmoonak -pAzmoonak@123 azmoonak < "%SQLFILE%"
if errorlevel 1 (
  echo [خطا] بازیابی ناموفق بود.
) else (
  echo [خوب] بازیابی انجام شد. سرویس را دوباره اجرا کنید.
)
pause
