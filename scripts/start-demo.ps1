$ErrorActionPreference = 'Stop'
$demoRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $demoRoot
$mutex = New-Object System.Threading.Mutex($false, 'TrustChainLocalDemoStartup')
if (!$mutex.WaitOne(0)) { throw 'Demo startup is already running. Wait for that window to finish.' }
try {
    $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
    $dockerBin = if ($dockerCommand) { $dockerCommand.Source } else {
        @("$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe", "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe") |
            Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (!$dockerBin) { throw 'Install/open Docker Desktop first.' }
    & $dockerBin info --format '{{.ServerVersion}}'
    if ($LASTEXITCODE -ne 0) { throw 'Open Docker Desktop, wait until its engine is running, then retry.' }
    & $dockerBin compose up -d --wait postgres mailpit ipfs chain
    if ($LASTEXITCODE -ne 0) { throw 'Docker startup failed. If port 8545 is occupied, stop the old Hardhat terminal; do not reset any volumes.' }
    if (!(Test-Path 'node_modules/hardhat')) { npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Root dependency installation failed.' } }
    if (!(Test-Path 'apps/web/node_modules')) { npm.cmd ci --prefix apps/web; if ($LASTEXITCODE -ne 0) { throw 'Web dependency installation failed.' } }
    node scripts/setup-auth-env.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Environment setup failed.' }
    node scripts/upgrade-profile-onboarding.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Profile onboarding upgrade failed; existing data was not reset.' }
    node scripts/ensure-demo-chain.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Blockchain verification failed; no automatic reset was attempted.' }

    $webReady = $false
    try { $response = Invoke-WebRequest 'http://localhost:3000/api/chain' -UseBasicParsing -TimeoutSec 10; $webReady = $response.StatusCode -eq 200 } catch {}
    if (!$webReady) {
        npm.cmd run db:generate --prefix apps/web
        if ($LASTEXITCODE -ne 0) { throw 'Prisma generation failed. Stop only the old web process and retry.' }
        npm.cmd run db:push --prefix apps/web -- --skip-generate
        if ($LASTEXITCODE -ne 0) { throw 'Database setup failed. Existing data was not reset.' }
    }
    npm.cmd run indexer:once
    if ($LASTEXITCODE -ne 0) { throw 'Indexer health check failed. See the error above.' }

    $logDir = Join-Path $demoRoot '.local/demo'
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    $nodeBin = (Get-Command node).Source
    $checkpointPath = Join-Path $demoRoot 'scripts/checkpoint-chain.cjs'
    $checkpointWorker = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($checkpointPath) }
    if (!$checkpointWorker) {
        Start-Process -FilePath $nodeBin -ArgumentList @('"' + $checkpointPath + '"', '--watch') -WorkingDirectory $demoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'chain-checkpoint.log') -RedirectStandardError (Join-Path $logDir 'chain-checkpoint-error.log') | Out-Null
    }
    # Detect only this workspace's worker; do not terminate other Node processes.
    $workerPath = Join-Path $demoRoot 'apps/indexer/worker.cjs'
    $worker = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($workerPath) }
    if (!$worker) {
        Start-Process -FilePath $nodeBin -ArgumentList @('"' + $workerPath + '"') -WorkingDirectory $demoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'indexer.log') -RedirectStandardError (Join-Path $logDir 'indexer-error.log') | Out-Null
    }
    if (!$webReady) {
        $nextCli = Join-Path $demoRoot 'apps/web/node_modules/next/dist/bin/next'
        Start-Process -FilePath $nodeBin -ArgumentList @('"' + $nextCli + '"', 'dev', '-p', '3000') -WorkingDirectory (Join-Path $demoRoot 'apps/web') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDir 'web.log') -RedirectStandardError (Join-Path $logDir 'web-error.log') | Out-Null
    }
    $deadline = (Get-Date).AddSeconds(90)
    do {
        try { $response = Invoke-WebRequest 'http://localhost:3000/api/chain' -UseBasicParsing -TimeoutSec 5; $webReady = $response.StatusCode -eq 200 } catch { $webReady = $false }
        if (!$webReady) { Start-Sleep -Seconds 2 }
    } while (!$webReady -and (Get-Date) -lt $deadline)
    if (!$webReady) { throw 'Web did not start. Read .local/demo/web-error.log.' }
    $health = Invoke-RestMethod 'http://localhost:3000/api/chain/health' -TimeoutSec 30
    if (!$health.ready) { throw 'Web cannot reach the matching blockchain deployment.' }
    Write-Host "`nTrustChain ready: http://localhost:3000/vi" -ForegroundColor Green
    Write-Host 'MetaMask: TrustChain Local | RPC http://127.0.0.1:8545 | Chain ID 31337'
    Write-Host 'Blockchain state is stored in Docker chain_data. Keep Docker Desktop running. Do not use compose down -v.'
    Write-Host 'This window can be closed. Web/indexer run in the background; logs: .local/demo/.'
} finally { $mutex.ReleaseMutex(); $mutex.Dispose() }
