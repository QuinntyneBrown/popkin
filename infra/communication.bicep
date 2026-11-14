// Azure Communication Services sends the codes and the crew invites (ADR 0021):
// - acs-popkin sends SMS from a toll-free number bought in the portal (`smsSender` in main.bicep);
// - acs-popkin-email sends email from DoNotReply@<domain> once the domain is checked, and from
//   the Azure-managed domain until then;
// - the apps' managed identity signs in to both; no key or connection string is handed out.
@description('The registered domain, whose Azure DNS zone (domains.bicep) takes the email records.')
param domain string

@description('Set once Azure has checked the domain (docs/deployment.md); mail then comes from it.')
param customEmailDomainVerified bool

@description('The principal ID of the managed identity the API signs in with.')
param principalId string

// Communication and Email Service Owner.
var communicationRoleId = '09976791-48a7-449e-bb21-39d1a415f350'

resource zone 'Microsoft.Network/dnsZones@2018-05-01' existing = {
  name: domain
}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: 'acs-popkin-email'
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

resource managedDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource customDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: domain
  location: 'global'
  properties: {
    domainManagement: 'CustomerManaged'
    userEngagementTracking: 'Disabled'
  }
}

// The records Azure checks the domain by: ownership and SPF share the apex's TXT record set,
// DKIM takes two CNAMEs.
var records = customDomain.properties.verificationRecords!

resource apexTxt 'Microsoft.Network/dnsZones/TXT@2018-05-01' = {
  parent: zone
  name: '@'
  properties: {
    TTL: 3600
    TXTRecords: [
      { value: [records.Domain!.value!] }
      { value: [records.SPF!.value!] }
    ]
  }
}

resource dkim 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: zone
  name: 'selector1-azurecomm-prod-net._domainkey'
  properties: {
    TTL: 3600
    CNAMERecord: { cname: records.DKIM!.value! }
  }
}

resource dkim2 'Microsoft.Network/dnsZones/CNAME@2018-05-01' = {
  parent: zone
  name: 'selector2-azurecomm-prod-net._domainkey'
  properties: {
    TTL: 3600
    CNAMERecord: { cname: records.DKIM2!.value! }
  }
}

resource communication 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: 'acs-popkin'
  location: 'global'
  properties: {
    dataLocation: 'United States'
    // A domain that is not checked yet cannot be linked.
    linkedDomains: [customEmailDomainVerified ? customDomain.id : managedDomain.id]
  }
}

resource communicationRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(communication.id, principalId, communicationRoleId)
  scope: communication
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', communicationRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

resource emailRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(emailService.id, principalId, communicationRoleId)
  scope: emailService
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', communicationRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}

output endpoint string = 'https://${communication.properties.hostName}'
output emailSender string = customEmailDomainVerified
  ? 'DoNotReply@${domain}'
  : 'DoNotReply@${managedDomain.properties.mailFromSenderDomain}'
