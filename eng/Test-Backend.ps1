#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Runs the backend test suite exactly as CI does. No database server is needed.
#>
$ErrorActionPreference = 'Stop'

$solution = Join-Path $PSScriptRoot '..' 'backend' 'Popkin.sln'

dotnet test $solution -c Release
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
