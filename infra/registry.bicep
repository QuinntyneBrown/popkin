// The container registry the images are pushed to (ADR 0018). Deployed before the images are
// built, so that main.bicep finds them there.
param location string = resourceGroup().location

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'popkin${uniqueString(resourceGroup().id)}'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

output name string = registry.name
output loginServer string = registry.properties.loginServer
