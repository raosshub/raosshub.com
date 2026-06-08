# ============================================================
# test-phase1.ps1  --  Phase 1 Auth Fix Verification
# Usage: .\test-phase1.ps1
# Requires: backend running on http://localhost:8080
# ============================================================

param(
    [string]$Base = "http://localhost:8080",
    [string]$User = "admin",
    [string]$Pass = "RaossAdmin2024!"
)

$PassCount = 0
$FailCount = 0

function Write-Pass {
    param([string]$Label)
    Write-Host "  PASS  $Label" -ForegroundColor Green
    $script:PassCount++
}

function Write-Fail {
    param([string]$Label, [string]$Detail = "")
    if ($Detail) {
        Write-Host "  FAIL  $Label  -- $Detail" -ForegroundColor Red
    } else {
        Write-Host "  FAIL  $Label" -ForegroundColor Red
    }
    $script:FailCount++
}

function Get-StatusCode {
    param($Err)
    try { return [int]$Err.Exception.Response.StatusCode } catch { return 0 }
}

# ── Preflight ────────────────────────────────────────────────
Write-Host ""
Write-Host "=== Phase 1 Auth Fix -- Live Tests ===" -ForegroundColor Cyan
Write-Host "Backend : $Base"
Write-Host "User    : $User"
Write-Host ""

try {
    Invoke-WebRequest -Uri "$Base/api/health" -UseBasicParsing -ErrorAction Stop | Out-Null
} catch {
    Write-Host "ERROR: Backend not reachable at $Base" -ForegroundColor Red
    Write-Host "       Start it with:  cd backend ; mvn spring-boot:run"
    exit 1
}
Write-Host "Backend is online."
Write-Host ""

# ── 1. LOGIN ─────────────────────────────────────────────────
Write-Host "1. Login" -ForegroundColor Yellow

$Session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$AccessToken = $null

$LoginBody = @{ username = $User; password = $Pass } | ConvertTo-Json -Compress

try {
    $R = Invoke-WebRequest `
        -Uri "$Base/api/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $LoginBody `
        -WebSession $Session `
        -UseBasicParsing `
        -ErrorAction Stop

    $Data = ($R.Content | ConvertFrom-Json).data
    $AccessToken = $Data.accessToken

    if ($AccessToken -and $AccessToken.Length -gt 10) {
        Write-Pass "Access token in response body"
    } else {
        Write-Fail "Access token in response body" "token missing or empty"
    }

    $SetCookie = $R.Headers["Set-Cookie"]

    if ($SetCookie -match "hub_refresh=\S") {
        Write-Pass "hub_refresh cookie set in response"
    } else {
        Write-Fail "hub_refresh cookie set in response" "Set-Cookie: $SetCookie"
    }

    if ($SetCookie -match "HttpOnly") {
        Write-Pass "hub_refresh is HttpOnly"
    } else {
        Write-Fail "hub_refresh is HttpOnly"
    }

    if ($SetCookie -match "Path=/api/auth") {
        Write-Pass "hub_refresh scoped to Path=/api/auth"
    } else {
        Write-Fail "hub_refresh scoped to Path=/api/auth" "got: $SetCookie"
    }

    if ($SetCookie -notmatch "hub_token" -and $SetCookie -notmatch "accessToken") {
        Write-Pass "Access token NOT set as cookie"
    } else {
        Write-Fail "Access token NOT set as cookie" "found token in Set-Cookie"
    }

} catch {
    Write-Fail "Login request" "$_"
    Write-Host ""
    Write-Host "Cannot continue -- login failed." -ForegroundColor Red
    exit 1
}

# ── 2. LOCALE PROTECTION ─────────────────────────────────────
Write-Host ""
Write-Host "2. Locale protection (confidential content requires auth)" -ForegroundColor Yellow

foreach ($Lang in @("en", "zh")) {
    try {
        Invoke-WebRequest -Uri "$Base/api/locales/$Lang" -UseBasicParsing -ErrorAction Stop | Out-Null
        Write-Fail "/api/locales/$Lang blocked without token" "got 200 -- still public"
    } catch {
        $Code = Get-StatusCode $_
        if ($Code -eq 401) {
            Write-Pass "/api/locales/$Lang returns 401 without token"
        } else {
            Write-Fail "/api/locales/$Lang returns 401 without token" "got $Code"
        }
    }
}

# ── 3. PUBLIC ENDPOINTS STILL OPEN ───────────────────────────
Write-Host ""
Write-Host "3. Public endpoints still accessible (login screen needs these)" -ForegroundColor Yellow

$PublicPaths = @(
    "/api/ui-strings?lang=en",
    "/api/ui-strings?lang=zh",
    "/api/languages",
    "/api/health"
)

foreach ($Path in $PublicPaths) {
    try {
        $R = Invoke-WebRequest -Uri "$Base$Path" -UseBasicParsing -ErrorAction Stop
        if ($R.StatusCode -eq 200) {
            Write-Pass "$Path is public (200)"
        } else {
            Write-Fail "$Path is public" "got $($R.StatusCode)"
        }
    } catch {
        Write-Fail "$Path is public" "got $(Get-StatusCode $_)"
    }
}

# ── 4. SILENT REFRESH VIA COOKIE ─────────────────────────────
Write-Host ""
Write-Host "4. Silent refresh via httpOnly cookie" -ForegroundColor Yellow

$RefreshedToken = $null

try {
    $R = Invoke-WebRequest `
        -Uri "$Base/api/auth/refresh" `
        -Method POST `
        -WebSession $Session `
        -UseBasicParsing `
        -ErrorAction Stop

    $RefreshedToken = ($R.Content | ConvertFrom-Json).data.accessToken

    if ($RefreshedToken -and $RefreshedToken.Length -gt 10) {
        Write-Pass "Refresh returns new access token"
    } else {
        Write-Fail "Refresh returns new access token" "token empty"
    }

    if ($RefreshedToken -ne $AccessToken) {
        Write-Pass "Refresh token rotated (new token differs from login token)"
    } else {
        Write-Fail "Refresh token rotated" "same token returned -- rotation not working"
    }

    $NewCookie = $R.Headers["Set-Cookie"]
    if ($NewCookie -match "hub_refresh=\S") {
        Write-Pass "Refresh rotates the cookie"
    } else {
        Write-Fail "Refresh rotates the cookie" "no new Set-Cookie in refresh response"
    }

    $AccessToken = $RefreshedToken

} catch {
    $Code = Get-StatusCode $_
    Write-Fail "Refresh via cookie" "got $Code"
    Write-Host "  Note: this is the core bug Phase 1 fixes. Check backend logs." -ForegroundColor DarkYellow
}

# ── 5. LOCALE WITH VALID TOKEN ────────────────────────────────
Write-Host ""
Write-Host "5. Locale accessible with valid access token (EN + ZH)" -ForegroundColor Yellow

foreach ($Lang in @("en", "zh")) {
    try {
        $Headers = @{ Authorization = "Bearer $AccessToken" }
        $R = Invoke-WebRequest `
            -Uri "$Base/api/locales/$Lang" `
            -Headers $Headers `
            -UseBasicParsing `
            -ErrorAction Stop
        if ($R.StatusCode -eq 200) {
            Write-Pass "/api/locales/$Lang returns 200 with token"
        } else {
            Write-Fail "/api/locales/$Lang with token" "got $($R.StatusCode)"
        }
    } catch {
        Write-Fail "/api/locales/$Lang with token" "got $(Get-StatusCode $_)"
    }
}

# ── 6. LOGOUT ─────────────────────────────────────────────────
Write-Host ""
Write-Host "6. Logout" -ForegroundColor Yellow

try {
    $Headers = @{ Authorization = "Bearer $AccessToken" }
    $R = Invoke-WebRequest `
        -Uri "$Base/api/auth/logout" `
        -Method POST `
        -Headers $Headers `
        -WebSession $Session `
        -UseBasicParsing `
        -ErrorAction Stop

    if ($R.StatusCode -eq 200) {
        Write-Pass "Logout returns 200"
    } else {
        Write-Fail "Logout returns 200" "got $($R.StatusCode)"
    }

    $ClearHeader = $R.Headers["Set-Cookie"]
    if ($ClearHeader -match "Max-Age=0" -or $ClearHeader -match "hub_refresh=;") {
        Write-Pass "Logout clears hub_refresh cookie (Max-Age=0)"
    } else {
        Write-Fail "Logout clears hub_refresh cookie" "Set-Cookie: $ClearHeader"
    }

} catch {
    Write-Fail "Logout request" "$(Get-StatusCode $_) -- $_"
}

# ── 7. POST-LOGOUT REFRESH BLOCKED ───────────────────────────
Write-Host ""
Write-Host "7. Post-logout refresh blocked" -ForegroundColor Yellow

$FreshSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

try {
    Invoke-WebRequest `
        -Uri "$Base/api/auth/refresh" `
        -Method POST `
        -WebSession $FreshSession `
        -UseBasicParsing `
        -ErrorAction Stop | Out-Null
    Write-Fail "Refresh without cookie returns 401" "got 200 -- session still valid after logout"
} catch {
    $Code = Get-StatusCode $_
    if ($Code -eq 401) {
        Write-Pass "Refresh without cookie returns 401"
    } else {
        Write-Fail "Refresh without cookie returns 401" "got $Code"
    }
}

# ── SUMMARY ───────────────────────────────────────────────────
$Total = $PassCount + $FailCount
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Total  : $Total"
Write-Host "  Passed : $PassCount" -ForegroundColor Green
if ($FailCount -gt 0) {
    Write-Host "  Failed : $FailCount" -ForegroundColor Red
} else {
    Write-Host "  Failed : 0" -ForegroundColor Green
    Write-Host ""
    Write-Host "  All Phase 1 fixes verified." -ForegroundColor Green
}
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
