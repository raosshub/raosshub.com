# ============================================================
# RAOSS Hub -- psql seed runner
# Place this file at: RAOSSHUB-v3\run-seed.ps1
#
# Usage:
#   Double-click run-seed.bat  -> lists db\ SQL files, pick one
#   .\run-seed.ps1             -> same as above
#   .\run-seed.ps1 filename.sql -> run specific file directly
#
# DB: 127.0.0.1:5432  user:raoss  db:raosshub
# ============================================================

param([string]$SqlFileName = "")

$env:PGPASSWORD        = "raoss_dev_2024"
$env:PGCLIENTENCODING  = "UTF8"
$dbFolder = Join-Path $PSScriptRoot "db"

Write-Host ""
Write-Host "RAOSS Hub -- psql seed runner" -ForegroundColor Cyan
Write-Host "DB folder : $dbFolder"         -ForegroundColor Gray
Write-Host ""

# -- 1. Check psql is in PATH ----------------------------------
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
    Write-Host "ERROR: psql not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Add PostgreSQL bin to your PATH, e.g.:" -ForegroundColor Yellow
    Write-Host "  C:\Program Files\PostgreSQL\18\bin"   -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "psql      : $($psqlCmd.Source)" -ForegroundColor Gray

# -- 2. Test DB connection before listing files ----------------
Write-Host "Testing   : raosshub @ 127.0.0.1:5432 ..." -ForegroundColor Gray
$connTest = & psql -U raoss -d raosshub_test -h 127.0.0.1 -p 5432 -c "SELECT 1;" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Cannot connect to database." -ForegroundColor Red
    Write-Host $connTest -ForegroundColor Red
    Write-Host ""
    Write-Host "Check:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL service is running (services.msc)" -ForegroundColor Gray
    Write-Host "  2. Password matches application.yml spring.datasource.password" -ForegroundColor Gray
    Write-Host "  3. Database name: raosshub" -ForegroundColor Gray
    Write-Host "  4. Port: 5432" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}
Write-Host "Connected : OK" -ForegroundColor Green
Write-Host ""

# -- 3. Resolve which SQL file to run --------------------------
if ($SqlFileName -eq "") {
    $files = Get-ChildItem -Path $dbFolder -Filter "*.sql" `
                           -ErrorAction SilentlyContinue |
             Sort-Object Name

    if ($files.Count -eq 0) {
        Write-Host "No .sql files found in: $dbFolder" -ForegroundColor Red
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

# -- 4. Run ----------------------------------------------------
Write-Host "Running   : $SqlFileName" -ForegroundColor Cyan
Write-Host ""
psql -U raoss -d raosshub_test -h 127.0.0.1 -p 5432 `
     -v ON_ERROR_STOP=0 `
     -f $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Completed with errors (see above)." -ForegroundColor Yellow
    Write-Host "Statements before each error were still applied." -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
