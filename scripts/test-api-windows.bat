@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo اجرای تست سریع API (سرور باید در حال اجرا باشد)...
call npx tsx server\scripts\smoke-test.ts
pause
