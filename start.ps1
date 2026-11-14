# Portfolio one-click launcher for Windows (PowerShell 5.1+).
# Double-click start.cmd, or from a terminal:  .\start.ps1        (dev server, hot reload)
#                                               .\start.ps1 -Prod  (production build)
# Installs dependencies only when package-lock.json changed, starts the site,
# waits until it answers, then opens it in your default browser. Ctrl+C stops it.

param(
    [int]$Port = 3000,
    [switch]$Prod
)

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

function Fail([string]$message) {
    Write-Host $message -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# 1. Node.js 22+
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js 22 or newer is required: https://nodejs.org/"
}
$nodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
    Fail "Node.js 22 or newer is required (found $(node -v)): https://nodejs.org/"
}

# 2. Dependencies: reinstall only when the lockfile changed since the last install.
$lockHash = (Get-FileHash -Algorithm SHA256 -Path "package-lock.json").Hash
$stamp = Join-Path "node_modules" ".lock-hash"
$installed = if (Test-Path $stamp) { (Get-Content $stamp -Raw).Trim() } else { "" }
if (-not (Test-Path "node_modules") -or $installed -ne $lockHash) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm ci
    if ($LASTEXITCODE -ne 0) { Fail "npm ci failed. See the output above." }
    Set-Content -Path $stamp -Value $lockHash
}

# 3. Refuse to start on a port that is already taken (an old server would be opened instead).
$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
if ($busy) {
    Fail "Port $Port is already in use. Close that program or run: .\start.ps1 -Port 3001"
}

# 4. Start the site.
if ($Prod) {
    Write-Host "Building for production..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { Fail "Build failed. See the output above." }
    $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "start", "--", "-p", $Port -NoNewWindow -PassThru
} else {
    $server = Start-Process -FilePath "npm.cmd" -ArgumentList "run", "dev", "--", "-p", $Port -NoNewWindow -PassThru
}

# 5. Wait until it answers (up to 90 s), then open the browser.
$url = "http://localhost:$Port"
$deadline = (Get-Date).AddSeconds(90)
$ready = $false
while ((Get-Date) -lt $deadline -and -not $server.HasExited) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        if ($response.StatusCode -eq 200) { $ready = $true; break }
    } catch {
        Start-Sleep -Milliseconds 700
    }
}
if (-not $ready) {
    if (-not $server.HasExited) { Stop-Process -Id $server.Id -Force -ErrorAction SilentlyContinue }
    Fail "The site did not start within 90 seconds. See the output above."
}

Write-Host "Running at $url  (Ctrl+C to stop)" -ForegroundColor Green
Start-Process $url

try {
    Wait-Process -Id $server.Id
} finally {
    # Ctrl+C: stop the server and its child node process too.
    if (-not $server.HasExited) {
        # Start-Process, not "& taskkill 2>$null": in PowerShell 5.1 redirected stderr from a
        # native command becomes a terminating error under ErrorActionPreference = Stop.
        Start-Process -FilePath "taskkill.exe" -ArgumentList "/PID", $server.Id, "/T", "/F" -NoNewWindow -Wait
    }
}
