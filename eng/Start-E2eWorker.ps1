#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Starts the Worker locally beside the API of Start-E2eApi.ps1, on its SQLite database.
.DESCRIPTION
  Runs in the foreground; start Start-E2eApi.ps1 first, in another terminal. The Worker reads
  and writes the same SQLite file and the same photo folder as that API, so what it does shows
  in the running app: a Popkin whose time is up wraps up within a minute, "Save the album"
  becomes a zip to download, and the photos of a Popkin wrapped up without its album go after
  30 days.

  It sends no hub events: an open screen learns of a wrap-up from its own clock check.
#>
param(
    # The SQLite file of the running API. The default is the one Start-E2eApi.ps1 made last.
    [string]$Database
)

$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot '..' 'backend' 'src' 'Popkin.Worker'
$databaseDirectory = Join-Path ([System.IO.Path]::GetTempPath()) 'popkin-e2e'

if (-not $Database) {
    $latest = Get-ChildItem -Path $databaseDirectory -Filter 'popkin-e2e-*.db' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) {
        Write-Error "No database of the local API was found in $databaseDirectory. Start eng/Start-E2eApi.ps1 first."
        exit 1
    }

    $Database = $latest.FullName
}

$env:DOTNET_ENVIRONMENT = 'Development'
$env:Database__Provider = 'Sqlite'
$env:ConnectionStrings__Popkin = "DataSource=$Database"
# The photo files of the API's run, beside its database.
$env:Photos__Root = Join-Path $databaseDirectory 'photos'

dotnet run --project $project -c Release --no-launch-profile
exit $LASTEXITCODE
