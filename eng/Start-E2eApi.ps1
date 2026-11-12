#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Starts the API locally on http://localhost:5080, on SQLite.
.DESCRIPTION
  Runs in the foreground. The API uses a fresh SQLite database file, so no SQL Server or LocalDB
  is needed. Readiness: GET http://localhost:5080/api/health. The Angular dev server sends /api
  here (frontend/proxy.conf.json).
#>
param(
    # The port to listen on. The dev server's proxy expects the default.
    [int]$Port = 5080
)

$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot '..' 'backend' 'src' 'Popkin.Api'

$databaseDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'popkin-e2e'
New-Item -ItemType Directory -Force -Path $databaseDirectory | Out-Null
$database = Join-Path $databaseDirectory "popkin-e2e-$PID.db"
Get-ChildItem -Path $databaseDirectory -Filter 'popkin-e2e-*.db*' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

$env:ASPNETCORE_ENVIRONMENT = 'Development'
$env:ASPNETCORE_URLS = "http://localhost:$Port"
$env:Database__Provider = 'Sqlite'
$env:ConnectionStrings__Popkin = "DataSource=$database"

dotnet run --project $project -c Release --no-launch-profile
exit $LASTEXITCODE
