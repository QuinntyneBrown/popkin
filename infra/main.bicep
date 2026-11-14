// Popkin on Azure (ADR 0018, the shape of ADR 0013):
// - popkin-web: the reverse proxy, public, serving the app and forwarding /api and /hubs.
// - popkin-api: one instance (ADR 0009), reachable inside the environment only; its init
//   container runs `popkin migrate` before the new API starts.
// - popkin-worker: one instance, no ingress.
// - Azure SQL, signed in with the apps' managed identity; no password exists.
// - The marketing site (ADR 0017): a Static Web App of its own, public, on its own address.
@description('The tag of the images to run: the commit being deployed.')
param imageTag string

@secure()
@description('Auth:CodeHashKey, shared by the API and the Worker.')
param authCodeHashKey string

@secure()
@description('Photos:SigningKey, shared by the API and the Worker.')
param photosSigningKey string

param location string = resourceGroup().location

@description('Azure SQL takes no new servers in some regions (East US 2 among them); the nearest that does.')
param sqlLocation string = 'centralus'

var suffix = uniqueString(resourceGroup().id)
var acrPullRoleId = '7f951dda-4ed3-4680-a7ca-43fe172d538d'

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

var appOrigin = 'https://popkin-web.${environment.properties.defaultDomain}'
var connectionString = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Database=${database.name};Authentication=Active Directory Managed Identity;User Id=${identity.properties.clientId};Encrypt=True;TrustServerCertificate=False;Connection Timeout=60'
var databaseEnv = [
  { name: 'Database__Provider', value: 'SqlServer' }
  { name: 'ConnectionStrings__Popkin', value: connectionString }
]
var keyEnv = [
  { name: 'Auth__CodeHashKey', secretRef: 'auth-code-hash-key' }
  { name: 'Photos__SigningKey', secretRef: 'photos-signing-key' }
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
  dependsOn: [acrPull, sqlFirewall]
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
          env: concat(databaseEnv, keyEnv, [
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
          env: concat(databaseEnv, keyEnv)
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

output appUrl string = appOrigin
output marketingUrl string = 'https://${marketing.properties.defaultHostname}'
output marketingName string = marketing.name
