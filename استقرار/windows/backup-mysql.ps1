# ---------------------------------------------------------------------
#  ازمونک — پشتیبان‌گیری خودکار (نسخه‌ی PowerShell، مناسب Task Scheduler)
#
#  ثبت زمان‌بندی هر شب ساعت ۲۳:
#    powershell -ExecutionPolicy Bypass -File "C:\azmoonak\استقرار\windows\backup-mysql.ps1"
#
#  اجرای دستی:
#    powershell -ExecutionPolicy Bypass -File ".\استقرار\windows\backup-mysql.ps1"
# ---------------------------------------------------------------------

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [string]$BackupDir   = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path 'backups'),
    [string]$DbUser      = 'azmoonak',
    [string]$DbPassword  = 'Azmoonak@123',
    [string]$DbName      = 'azmoonak',
    [int]$KeepDays       = 30
)

$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'

if (-not (Test-Path $BackupDir)) { New-Item -ItemType Directory -Path $BackupDir | Out-Null }

# --- پیدا کردن mysqldump (XAMPP یا مسیرهای رایج) ---
function Find-MySqlDump {
    $cmd = Get-Command mysqldump -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $candidates = @(
        'C:\xampp\mysql\bin\mysqldump.exe',
        'C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe',
        'C:\Program Files\MariaDB*\bin\mysqldump.exe'
    )
    foreach ($c in $candidates) {
        $found = Get-ChildItem $c -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}

# --- ۱) پشتیبان دیتابیس ---
$dump = Find-MySqlDump
if ($dump) {
    $sqlFile = Join-Path $BackupDir "azmoonak-$stamp.sql"
    $args = @(
        "-u$DbUser", "-p$DbPassword", '--single-transaction', '--default-character-set=utf8mb4',
        $DbName
    )
    # نگه‌داشتن پسورد در متغیر محیطی تا در خط فرمان دیده نشود
    $env:MYSQL_PWD = $DbPassword
    & $dump @args | Out-File -FilePath $sqlFile -Encoding utf8
    Remove-Item Env:\MYSQL_PWD
    Write-Host "[خوب] پشتیبان دیتابیس ساخته شد: $sqlFile"
} else {
    Write-Warning 'mysqldump پیدا نشد؛ فقط فایل‌ها پشتیبان‌گیری می‌شوند.'
}

# --- ۲) پشتیبان فایل‌های بارگذاری‌شده ---
$uploads = Join-Path $ProjectRoot 'server\data\uploads'
if (Test-Path $uploads) {
    $zipFile = Join-Path $BackupDir "uploads-$stamp.zip"
    Compress-Archive -Path $uploads -DestinationPath $zipFile -Force
    Write-Host "[خوب] پشتیبان فایل‌ها ساخته شد: $zipFile"
}

# --- ۳) حذف پشتیبان‌های قدیمی ---
Get-ChildItem $BackupDir -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "پشتیبان‌ها در: $BackupDir"
