$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else {
    @(
        "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",
        "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (!$dockerPath) { throw 'Docker CLI not found. Install Docker Desktop and reopen the terminal.' }

& $dockerPath compose up -d --wait postgres mailpit
if ($LASTEXITCODE -ne 0) { throw 'Cannot start PostgreSQL. Open Docker Desktop and try again.' }

if (!(Test-Path 'apps/web/.env')) {
    Copy-Item 'apps/web/.env.example' 'apps/web/.env'
}
node scripts/setup-auth-env.cjs
if ($LASTEXITCODE -ne 0) { throw 'Authentication environment setup failed.' }
if (!(Test-Path 'apps/web/node_modules')) {
    npm.cmd ci --prefix apps/web
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
npm.cmd run db:generate --prefix apps/web
if ($LASTEXITCODE -ne 0) { throw 'Prisma generation failed. Stop the running web server and try again.' }
npm.cmd run db:push --prefix apps/web -- --skip-generate
if ($LASTEXITCODE -ne 0) { throw 'Database setup failed. Check apps/web/.env.' }
npm.cmd run dev --prefix apps/web
