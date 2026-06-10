# ═══════════════════════════════════════════════════════════════
# RAOSS Hub — psql runner (no password prompt)
# Use 127.0.0.1 NOT localhost — avoids Windows IPv6 block (10013)
# Default password from application.yml: raoss_dev_2024
# ═══════════════════════════════════════════════════════════════
$env:PGPASSWORD = "raoss_dev_2024"
$sqlFile = Join-Path $PSScriptRoot "db\seed-nda-i18n-v3.1.1.sql"
Write-Host "RAOSS Hub — psql" -ForegroundColor Cyan
psql -U raoss -d raosshub -h 127.0.0.1 -p 5432 -f $sqlFile
if ($LASTEXITCODE -eq 0) { Write-Host "Done." -ForegroundColor Green }
else { Write-Host "Failed. Check: backend/src/main/resources/application.yml → spring.datasource.password" -ForegroundColor Red }
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
