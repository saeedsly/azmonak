@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0..\.."

REM ---------------------------------------------------------------------
REM  ازمونك - پشتیبان‌گیری خودکار MySQL + فایل‌های بارگذاری‌شده (ویندوز)
REM  اجرای دستی:  scripts\..\استقرار\windows\backup-mysql.bat
REM  اجرای زمان‌بندی‌شده: از طریق Task Scheduler (هر شب ساعت ۲۳)
REM ---------------------------------------------------------------------

set "BACKUP_DIR=%~dp0..\..\backups"
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM تاریخ به شکل YYYY-MM-DD_HHMM
for /f "tokens=2 delims==" %%a in ('wmic os get LocalDateTime /value ^| find "="') do set "LDT=%%a"
set "STAMP=%LDT:~0,4%-%LDT:~4,2%-%LDT:~6,2%_%LDT:~10,2%%LDT:~12,2%"
set "STAMP=%STAMP: =%"

echo [۱/۳] پشتیبان‌گیری از پایگاه داده...
set "MYSQLDUMP="
for %%P in (mysql, mariadb) do (
  if not defined MYSQLDUMP (
    for /f "delims=" %%m in ('where %%P 2^>nul') do set "MYSQLDUMP=%%m"
  )
)

if defined MYSQLDUMP (
  "%MYSQLDUMP%" -u azmoonak -pAzmoonak@123 --single-transaction --routines --default-character-set=utf8mb4 azmoonak > "%BACKUP_DIR%\azmoonak-%STAMP%.sql"
  if errorlevel 1 (
    echo [خطا] پشتیبان‌گیری از MySQL ناموفق بود.
  ) else (
    echo [خوب] فایل SQL ساخته شد: azmoonak-%STAMP%.sql
  )
) else (
  echo [اطلاع] mysql/mariadb در PATH پیدا نشد؛ اگر XAMPP دارید مسیر bin را به PATH اضافه کنید
  echo         یا از phpMyAdmin استفاده کنید.
)

echo [۲/۳] پشتیبان‌گیری از فایل‌های بارگذاری‌شده...
if exist "server\data\uploads" (
  powershell -NoProfile -Command "Compress-Archive -Path 'server\data\uploads' -DestinationPath '%BACKUP_DIR%\uploads-%STAMP%.zip' -Force" >nul 2>nul
  if errorlevel 1 (
    echo [اطلاع] فشرده‌سازی فایل‌ها ناموفق بود؛ پوشه را دستی کپی کنید.
  ) else (
    echo [خوب] فایل ZIP ساخته شد: uploads-%STAMP%.zip
  )
) else (
  echo [اطلاع] پوشه‌ی uploads وجود ندارد (هنوز فایلی بارگذاری نشده).
)

echo [۳/۳] پاک‌سازی پشتیبان‌های قدیمی‌تر از ۳۰ روز...
forfiles /p "%BACKUP_DIR%" /m *.sql /d -30 /c "cmd /c del @path" >nul 2>nul
forfiles /p "%BACKUP_DIR%" /m *.zip /d -30 /c "cmd /c del @path" >nul 2>nul

echo.
echo پشتیبان‌ها در: %BACKUP_DIR%
pause
