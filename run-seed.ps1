# ═══════════════════════════════════════════════════════════════
# RAOSS Hub — psql seed runner
# Place this file at: RAOSSHUB-v3\run-seed.ps1
#
# Usage:
#   Double-click          → lists all .sql files in db\, pick one
#   .\run-seed.ps1        → same as above
#   .\run-seed.ps1 seed-forgot-password-keys.sql   → run specific file
#
# DB connection:
#   Password from application.yml: raoss_dev_2024
#   Uses 127.0.0.1 (NOT localhost) — avoids Windows IPv6 block (error 10013)
# ═══════════════════════════════════════════════════════════════

param(
    [string]$SqlFileName = ""
)

$env:PGPASSWORD = "raoss_dev_2024"
$dbFolder = Join-Path $PSScriptRoot "db"

Write-Host ""
Write-Host "RAOSS Hub — psql seed runner" -ForegroundColor Cyan
Write-Host "DB folder: $dbFolder" -ForegroundColor Gray
Write-Host ""

# ── Resolve which SQL file to run ──────────────────────────────
if ($SqlFileName -eq "") {
    # List all .sql files in db\ sorted by name
    $files = Get-ChildItem -Path $dbFolder -Filter "*.sql" -ErrorAction SilentlyContinue |
             Sort-Object Name

    if ($files.Count -eq 0) {
        Write-Host "No .sql files found in db\" -ForegroundColor Red
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }

    Write-Host "Available SQL files:" -ForegroundColor White
    for ($i = 0; $i -lt $files.Count; $i++) {
        Write-Host "  [$($i + 1)]  $($files[$i].Name)" -ForegroundColor Gray
    }
    Write-Host ""
    $choice = Read-Host "Enter number (or type filename)"
    Write-Host ""

    if ($choice -match '^\d+$') {
        $idx = [int]$choice - 1
        if ($idx -ge 0 -and $idx -lt $files.Count) {
            $SqlFileName = $files[$idx].Name
        } else {
            Write-Host "Invalid selection." -ForegroundColor Red
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
            exit 1
        }
    } else {
        $SqlFileName = $choice.Trim()
    }
}

$sqlFile = Join-Path $dbFolder $SqlFileName

if (-not (Test-Path $sqlFile)) {
    Write-Host "File not found: $sqlFile" -ForegroundColor Red
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ── Run ────────────────────────────────────────────────────────
Write-Host "Running: $SqlFileName" -ForegroundColor Cyan
psql -U raoss -d raosshub -h 127.0.0.1 -p 5432 -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done. (ON CONFLICT DO NOTHING — safe to run again)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Failed." -ForegroundColor Red
    Write-Host "Check spring.datasource.password in:" -ForegroundColor Yellow
    Write-Host "  backend\src\main\resources\application.yml" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
