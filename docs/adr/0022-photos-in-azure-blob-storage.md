# 0022. Photo files are kept in Azure Blob Storage

## Status

Accepted, 14 November 2026. Settles the photo store provider that
[Add photos](../detailed-designs/photos/add-photos/README.md), the register of known gaps (gap 9)
and [`docs/deployment.md`](../deployment.md) left as `<TO SUPPLY>`.

## Context

Every photo Popkin keeps goes through `IPhotoStore`: a profile photo (L2-013), an album photo
(L2-031), a photo in chat, an experience's picture and an album's zip (L2-046). No provider was
chosen, so outside Development the API and the Worker used `UnconfiguredPhotoStore`, which throws
on every save. On the deployed app every upload answered 500 and the Add photos dialog said "The
photo didn't upload." for every photo, whatever its type or size.

Popkin runs on Azure ([ADR 0018](0018-deploy-to-azure-on-every-commit.md)), and its apps sign in
to Azure SQL and Azure Communication Services with one user-assigned managed identity
([ADR 0021](0021-codes-and-invites-by-azure-communication-services.md)). The address scheme is
already settled by [Join a Popkin](../detailed-designs/invitations/join-popkin/README.md): the API
signs each read address with `PhotoUrlSigner`, it expires after an hour, and the API serves the
file at `/api/files/{key}`.

## Decision

- **Azure Blob Storage keeps the files.** The storage account `stpopkin{suffix}` holds one
  private container, `photos`; a file's blob name is its key. Bicep declares both.
- **The managed identity signs in; no key exists.** The apps' identity holds Storage Blob Data
  Contributor on the account. The account refuses shared-key access and public blobs, and takes
  HTTPS with TLS 1.2 or later only. Azure Storage encrypts every blob at rest (L2-054 AC5).
- **The API still serves every file.** `BlobPhotoStore` keeps `PhotoUrlSigner`'s addresses, so a
  read address, its expiry and its download name do not change, and no SAS token is issued.
- **The settings.** `Photos:BlobEndpoint` turns the store on, in any environment;
  `Photos:Container` names the container (`photos` unless set); `Photos:ClientId` names the
  user-assigned identity (the default Azure credential when absent). The API and the Worker are
  given the same three. In Development, without `Photos:BlobEndpoint`, files stay on the machine
  (`LocalPhotoStore`), as before.

## Consequences

- Profile photos, the album, photos in chat, experiences' pictures and album exports work on the
  deployed app once this is deployed.
- Each photo is read through the API, which uses the API's bandwidth and its one instance
  ([ADR 0009](0009-one-api-instance.md)). Serving photos straight from storage, or from Front
  Door, with signed addresses of the store's own is a later change and would need its own record.
- Storage costs money per gigabyte kept and per operation. Nothing removes a photo uploaded from
  the composer whose message is never sent (known gap 71).
- Known gap 9 is closed.
