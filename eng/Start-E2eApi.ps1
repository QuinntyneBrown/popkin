#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Starts the API locally on http://localhost:5080, on SQLite.
.DESCRIPTION
  Runs in the foreground. The API uses a fresh SQLite database file, made and seeded with
  `popkin reset`, so no SQL Server or LocalDB is needed. Readiness: GET
  http://localhost:5080/api/health. The Angular dev server sends /api here
  (frontend/proxy.conf.json), and `npm run record-api` in e2e/ records its answers.

  Every code it issues is 482913 (Auth:DevelopmentCode, Development only), so the recorder can
  confirm codes, and the codes are written to the log instead of being sent.
#>
param(
    # The port to listen on. The dev server's proxy expects the default.
    [int]$Port = 5080
)

$ErrorActionPreference = 'Stop'

$backend = Join-Path $PSScriptRoot '..' 'backend' 'src'
$project = Join-Path $backend 'Popkin.Api'
$cli = Join-Path $backend 'Popkin.Cli'

$databaseDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'popkin-e2e'
New-Item -ItemType Directory -Force -Path $databaseDirectory | Out-Null
$database = Join-Path $databaseDirectory "popkin-e2e-$PID.db"
Get-ChildItem -Path $databaseDirectory -Filter 'popkin-e2e-*.db*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:DOTNET_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = "http://localhost:$Port"
$env:Database__Provider = 'Sqlite'
$env:ConnectionStrings__Popkin = "DataSource=$database"
$env:Auth__DevelopmentCode = '482913'
$env:App__Origin = 'http://localhost:4200'

dotnet run --project $cli -c Release -- reset
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

dotnet run --project $project -c Release --no-launch-profile
exit $LASTEXITCODE
