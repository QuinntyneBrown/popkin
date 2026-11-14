// Popkin on Azure (ADR 0018, the shape of ADR 0013):
// - popkin-web: the reverse proxy, public, serving the app and forwarding /api and /hubs.
// - popkin-api: one instance (ADR 0009), reachable inside the environment only; its init
//   container runs `popkin migrate` before the new API starts.
// - popkin-worker: one instance, no ingress.
// - Azure SQL, signed in with the apps' managed identity; no password exists.
// - The marketing site (ADR 0017): a Static Web App of its own.
// - popkin.community (ADR 0020, domains.bicep): an Azure DNS zone and Azure Front Door, which
//   serve the app at app.popkin.community and at every *.popkin.community address, and the
//   marketing site at popkin.community and www.popkin.community.
// - Azure Communication Services (ADR 0021, communication.bicep) sends the codes and crew
//   invites by email and SMS.
// - Azure Blob Storage (ADR 0022) keeps the photo files and the albums' zips in a private
//   container, read and written with the apps' managed identity; no access key is used.
@description('The tag of the images to run: the commit being deployed.')
param imageTag string

@secure()
@description('Auth:CodeHashKey, shared by the API and the Worker.')
param authCodeHashKey string

@secure()
@description('Photos:SigningKey, shared by the API and the Worker.')
param photosSigningKey string

param location string = resourceGroup().location

@description('The registered domain: the app at app.<domain> and *.<domain>, the marketing site at <domain> and www.<domain>.')
param domain string = 'popkin.community'

@description('Set once Azure has checked popkin.community for email (docs/deployment.md); codes are then sent from it.')
param customEmailDomainVerified bool = true

@description('The toll-free number SMS is sent from, as +1…, once its verification is approved; empty sends no text.')
param smsSender string = ''

@description('Azure SQL takes no new servers in some regions (East US 2 among them); the nearest that does.')
param sqlLocation string = 'centralus'

var suffix = uniqueString(resourceGroup().id)
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'
var blobDataContributorRoleId = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe'

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' existing = {
  name: 'popkin${suffix}'
}

resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'id-popkin'
  location: location
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(registry.id, identity.id, acrPullRoleId)
  scope: registry
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', acrPullRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource logs 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-popkin'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: 'sql-popkin-${uniqueString(resourceGroup().id, sqlLocation)}'
  location: sqlLocation
  properties: {
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    administrators: {
      administratorType: 'ActiveDirectory'
      azureADOnlyAuthentication: true
      login: identity.name
      sid: identity.properties.principalId
      tenantId: subscription().tenantId
      principalType: 'Application'
    }
  }
}

// Azure services only, which is how the container apps reach it.
resource sqlFirewall 'Microsoft.Sql/servers/firewallRules@2023-08-01' = {
  parent: sqlServer
  name: 'AllowAllWindowsAzureIps'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource database 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: 'popkin'
  location: sqlLocation
  sku: {
    name: 'Basic'
    tier: 'Basic'
  }
}

// ADR 0022: the photo store. Nothing in it is public, and no shared key signs in to it.
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stpopkin${suffix}'
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
}

resource photosContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: 'photos'
  properties: { publicAccess: 'None' }
}

resource photosAccess 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, identity.id, blobDataContributorRoleId)
  scope: storage
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', blobDataContributorRoleId)
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-popkin'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
  }
}

// The app's own origin, on Front Door (ADR 0020). A Popkin's address, https://{address}.<domain>,
// reaches the same app.
var appOrigin = 'https://app.${domain}'
module communication 'communication.bicep' = {
  name: 'communication'
  params: {
    domain: domain
    customEmailDomainVerified: customEmailDomainVerified
    principalId: identity.properties.principalId
  }
}

// ADR 0021: a channel without its sender stays unconfigured.
var communicationEnv = concat(
  [
    { name: 'Communication__Endpoint', value: communication.outputs.endpoint }
    { name: 'Communication__ClientId', value: identity.properties.clientId }
    { name: 'Communication__EmailSender', value: communication.outputs.emailSender }
  ],
  empty(smsSender) ? [] : [{ name: 'Communication__SmsSender', value: smsSender }]
)
var connectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${database.name};Authentication=Active Directory Managed Identity;User Id=${identity.properties.clientId};Encrypt=True;TrustServerCertificate=False;Connection Timeout=60'
var databaseEnv = [
  { name: 'Database__Provider', value: 'SqlServer' }
  { name: 'ConnectionStrings__Popkin', value: connectionString }
]
var keyEnv = [
  { name: 'Auth__CodeHashKey', secretRef: 'auth-code-hash-key' }
  { name: 'Photos__SigningKey', secretRef: 'photos-signing-key' }
]
// ADR 0022: the API and the Worker read and write the same photo store.
var photosEnv = [
  { name: 'Photos__BlobEndpoint', value: storage.properties.primaryEndpoints.blob }
  { name: 'Photos__Container', value: photosContainer.name }
  { name: 'Photos__ClientId', value: identity.properties.clientId }
]
var secrets = [
  { name: 'auth-code-hash-key', value: authCodeHashKey }
  { name: 'photos-signing-key', value: photosSigningKey }
]
var userIdentity = {
  type: 'UserAssigned'
  userAssignedIdentities: { '${identity.id}': {} }
}
var registries = [
  {
    server: registry.properties.loginServer
    identity: identity.id
  }
]

resource api 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'popkin-api'
  location: location
  identity: userIdentity
  dependsOn: [acrPull, sqlFirewall, photosAccess]
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secrets
      registries: registries
      // Inside the environment only: the web proxy is its one way in.
      ingress: {
        external: false
        targetPort: 8080
        transport: 'auto'
        allowInsecure: true
      }
    }
    template: {
      // ADR 0013: `popkin migrate` runs from the API image before the new API starts.
      initContainers: [
        {
          name: 'migrate'
          image: '${registry.properties.loginServer}/popkin-api:${imageTag}'
          command: ['dotnet', '/app/cli/popkin.dll', 'migrate']
          env: databaseEnv
          resources: { cpu: json('0.5'), memory: '1Gi' }
        }
      ]
      containers: [
        {
          name: 'api'
          image: '${registry.properties.loginServer}/popkin-api:${imageTag}'
          env: concat(databaseEnv, keyEnv, photosEnv, communicationEnv, [
            { name: 'App__Origin', value: appOrigin }
            { name: 'Invites__BaseUrl', value: '${appOrigin}/i' }
          ])
          resources: { cpu: json('0.5'), memory: '1Gi' }
          probes: [
            {
              type: 'Liveness'
              httpGet: { path: '/api/health', port: 8080 }
              periodSeconds: 30
            }
            {
              type: 'Startup'
              httpGet: { path: '/api/health', port: 8080 }
              periodSeconds: 5
              failureThreshold: 24
            }
          ]
        }
      ]
      // ADR 0009: one instance, never more.
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}

resource worker 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'popkin-worker'
  location: location
  identity: userIdentity
  // The new API, and its migration, come first.
  dependsOn: [api]
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: secrets
      registries: registries
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: '${registry.properties.loginServer}/popkin-worker:${imageTag}'
          env: concat(databaseEnv, keyEnv, photosEnv)
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 1 }
    }
  }
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'popkin-web'
  location: location
  identity: userIdentity
  dependsOn: [acrPull]
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: registries
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'web'
          image: '${registry.properties.loginServer}/popkin-web:${imageTag}'
          env: [{ name: 'API_UPSTREAM', value: 'http://${api.name}' }]
          resources: { cpu: json('0.25'), memory: '0.5Gi' }
        }
      ]
      scale: { minReplicas: 1, maxReplicas: 3 }
    }
  }
}

resource marketing 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'swa-popkin-marketing'
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {}
}

module domains 'domains.bicep' = {
  name: 'domains'
  params: {
    domain: domain
    webHostName: web.properties.configuration.ingress.fqdn
    marketingHostName: marketing.properties.defaultHostname
  }
}

output appUrl string = domains.outputs.appOrigin
output marketingUrl string = domains.outputs.marketingOrigin
output marketingName string = marketing.name
