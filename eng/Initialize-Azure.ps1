#Requires -Version 7
<#
.SYNOPSIS
    Prepares Azure and GitHub, once, for the deployment of every commit to main (ADR 0018).

.DESCRIPTION
    Idempotent; safe to re-run. Needs `az` signed in to the subscription and `gh` signed in with
    admin rights on the repository. It creates:
    - the resource group;
    - an Entra application, `popkin-github-deploy`, that GitHub Actions signs in as through
      OpenID Connect, trusted for the repository's `production` environment only: no Azure secret
      is stored in GitHub;
    - its roles on the resource group: Contributor, and Role Based Access Control Administrator
      limited to assigning AcrPull, Communication and Email Service Owner (ADR 0021) and Storage
      Blob Data Contributor (ADR 0022), which main.bicep gives the apps' identity;
    - the GitHub environment `production`, deployable from main only, with the variables the
      Deploy workflow reads and the two keys the API and the Worker share, generated here once.
#>
[CmdletBinding()]
param(
    [string] $ResourceGroup = 'rg-popkin',
    [string] $Location = 'eastus2',
    [string] $Repository = 'QuinntyneBrown/popkin',
    [string] $Environment = 'production'
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true

$account = az account show -o json | ConvertFrom-Json
$subscriptionId = $account.id
$tenantId = $account.tenantId
Write-Host "Subscription $($account.name) ($subscriptionId)"

az group create --name $ResourceGroup --location $Location --output none
$scope = "/subscriptions/$subscriptionId/resourceGroups/$ResourceGroup"

$appName = 'popkin-github-deploy'
$appId = az ad app list --display-name $appName --query '[0].appId' -o tsv
if (-not $appId) {
    $appId = az ad app create --display-name $appName --query appId -o tsv
}
$principalId = az ad sp list --filter "appId eq '$appId'" --query '[0].id' -o tsv
if (-not $principalId) {
    $principalId = az ad sp create --id $appId --query id -o tsv
}

# GitHub's token names the repository either by name or, for newer repositories and owners, by
# name and immutable ID (`repo:owner@ownerId/name@repoId:...`). Both are trusted.
$ids = gh api "repos/$Repository" | ConvertFrom-Json
$owner, $name = $Repository -split '/'
$subjects = [ordered]@{
    "github-$Environment"     = "repo:${Repository}:environment:$Environment"
    "github-$Environment-ids" = "repo:$owner@$($ids.owner.id)/$name@$($ids.id):environment:$Environment"
}
foreach ($credentialName in $subjects.Keys) {
    $subject = $subjects[$credentialName]
    $existing = az ad app federated-credential list --id $appId --query "[?subject=='$subject'].name" -o tsv
    if ($existing) { continue }
    $credential = @{
        name      = $credentialName
        issuer    = 'https://token.actions.githubusercontent.com'
        subject   = $subject
        audiences = @('api://AzureADTokenExchange')
    } | ConvertTo-Json
    $file = New-TemporaryFile
    Set-Content -Path $file -Value $credential
    az ad app federated-credential create --id $appId --parameters "@$file" --output none
    Remove-Item $file
}

function Grant-Role([string] $Role, [string] $Condition) {
    $assigned = az role assignment list --assignee $principalId --scope $scope --role $Role -o json | ConvertFrom-Json | Select-Object -First 1
    if ($assigned -and "$($assigned.condition)" -eq "$Condition") { return }
    # An assignment with another condition is replaced, so a re-run brings it up to date.
    if ($assigned) { az role assignment delete --ids $assigned.id --output none }
    $arguments = @('role', 'assignment', 'create', '--assignee-object-id', $principalId,
        '--assignee-principal-type', 'ServicePrincipal', '--role', $Role, '--scope', $scope, '--output', 'none')
    if ($Condition) { $arguments += @('--condition', $Condition, '--condition-version', '2.0') }
    # A new service principal can take a minute to reach every region of Entra ID.
    for ($attempt = 1; ; $attempt++) {
        try { az @arguments; return }
        catch { if ($attempt -ge 6) { throw }; Start-Sleep -Seconds 10 }
    }
}

$acrPull = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
$communication = '09976791-48a7-449e-bb21-39d1a415f350'
$blobDataContributor = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
Grant-Role 'Contributor'
Grant-Role 'Role Based Access Control Administrator' (
    "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/write'})) OR " +
    "(@Request[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$acrPull, $communication, $blobDataContributor})) AND " +
    "((!(ActionMatches{'Microsoft.Authorization/roleAssignments/delete'})) OR " +
    "(@Resource[Microsoft.Authorization/roleAssignments:RoleDefinitionId] ForAnyOfAnyValues:GuidEquals {$acrPull, $communication, $blobDataContributor}))")

# The GitHub environment, deployable from main alone.
gh api --method PUT "repos/$Repository/environments/$Environment" `
    -F 'deployment_branch_policy[protected_branches]=false' `
    -F 'deployment_branch_policy[custom_branch_policies]=true' | Out-Null
$policies = gh api "repos/$Repository/environments/$Environment/deployment-branch-policies" --jq '.branch_policies[].name'
if ($policies -notcontains 'main') {
    gh api --method POST "repos/$Repository/environments/$Environment/deployment-branch-policies" -f name=main -f type=branch | Out-Null
}

$variables = @{
    AZURE_CLIENT_ID       = $appId
    AZURE_TENANT_ID       = $tenantId
    AZURE_SUBSCRIPTION_ID = $subscriptionId
    AZURE_RESOURCE_GROUP  = $ResourceGroup
}
foreach ($name in $variables.Keys) {
    gh variable set $name --env $Environment --repo $Repository --body $variables[$name]
}

# The keys are generated once: a new code hash key voids the codes in flight, and a new signing
# key voids every photo address handed out.
$secrets = gh secret list --env $Environment --repo $Repository --json name --jq '.[].name'
foreach ($name in 'AUTH_CODE_HASH_KEY', 'PHOTOS_SIGNING_KEY') {
    if ($secrets -notcontains $name) {
        $key = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
        $key | gh secret set $name --env $Environment --repo $Repository
    }
}

Write-Host "Ready: every commit to main now deploys to $ResourceGroup."
