#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Runs the backend test suite exactly as CI does. No database server is needed.

.DESCRIPTION
  With no -Shard, every test of the solution runs. CI runs the suite as four shards in parallel
  (ADR 0034); together they are the whole suite, and `-Shard <name>` runs one of them as CI does.
  The API tests stay sequential inside each shard (ADR 0005).

  - units: every test project but the API's;
  - api-1, api-2: named namespaces of the API tests;
  - api-3: every API test the other two leave, so a new namespace is never left out.
#>
param(
    [ValidateSet('all', 'units', 'api-1', 'api-2', 'api-3')]
    [string] $Shard = 'all'
)
$ErrorActionPreference = 'Stop'

$backend = Join-Path $PSScriptRoot '..' 'backend'
$solution = Join-Path $backend 'Popkin.sln'
$apiTests = Join-Path $backend 'tests' 'Popkin.Api.Tests'

# Balanced by measured duration; api-3 takes the rest.
$api1 = @('Chat', 'Contacts', 'Account', 'Members', 'Errors', 'Security')
$api2 = @('Photos', 'Experiences', 'Notifications', 'WrapUp')

function Get-NamespaceFilter([string[]] $namespaces, [string] $operator, [string] $join) {
    ($namespaces | ForEach-Object { "FullyQualifiedName$operator" + "Popkin.Api.Tests.$_." }) -join $join
}

switch ($Shard) {
    'all' { $target = $solution; $filter = $null }
    'units' { $target = $solution; $filter = 'FullyQualifiedName!~Popkin.Api.Tests.' }
    'api-1' { $target = $apiTests; $filter = Get-NamespaceFilter $api1 '~' '|' }
    'api-2' { $target = $apiTests; $filter = Get-NamespaceFilter $api2 '~' '|' }
    'api-3' { $target = $apiTests; $filter = Get-NamespaceFilter ($api1 + $api2) '!~' '&' }
}

$arguments = @('test', $target, '-c', 'Release')
if ($filter) {
    $arguments += @('--filter', $filter)
}

& dotnet @arguments
if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}
