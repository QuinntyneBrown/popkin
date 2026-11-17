# 0031. One Data Protection key ring, kept in Blob Storage and wrapped by Key Vault

## Status

Accepted, 17 November 2026. Settles gap 133 of the register of known gaps, which
[Unsubscribe](../detailed-designs/notifications/unsubscribe/README.md) left as `<TO SUPPLY>`, and
the setting `DataProtection:KeysPath (not built)` of `docs/deployment.md`.

## Context

ASP.NET Core Data Protection protects two things in Popkin:

- the **unsubscribe token** of every notification email (L2-168), which the Worker issues and
  the API reads, possibly months later; and
- the API's own protected payloads, the antiforgery and session cookies among them.

With no key ring configured, each process makes its own keys in memory, or in a folder inside its
container. A token the Worker issues cannot be read by the API, and every new revision of a
container app makes new keys, so every unsubscribe link in every inbox stops working and every
session cookie protected by Data Protection is lost. Both apps already sign in to Azure with one
user-assigned managed identity (`id-popkin`), and both already reach the storage account
`stpopkin{suffix}` that keeps the photos ([ADR 0022](0022-photos-in-azure-blob-storage.md)).

The options weighed:

- **A blob in the existing storage account, its keys wrapped by a Key Vault key**
  (`Azure.Extensions.AspNetCore.DataProtection.Blobs` and `.Keys`, first-party). One ring for
  both apps; nothing new to sign in to; a key at rest is encrypted twice (by Storage and by Key
  Vault), and a reader of the blob alone learns nothing.
- **A blob without Key Vault.** Simpler, but the keys rest unencrypted inside the XML, and Data
  Protection warns at every start; anyone granted read on the container could forge tokens.
- **The database** (`PersistKeysToDbContext`). The ring would ride along with the data, but a
  database export or a backup restore to another environment would carry live keys with it, and
  the keys would still rest unencrypted.
- **A file share mounted into both containers.** More infrastructure than a blob, and still
  unencrypted keys.

## Decision

- **One ring, one application name.** The API and the Worker both call
  `AddDataProtection().SetApplicationName("Popkin")`, so a payload protected by one is read by
  the other.
- **Kept in Blob Storage.** `DataProtection:BlobUri` names the blob, `dataprotection/keys.xml` in
  `stpopkin{suffix}`, in a private container of its own beside `photos`. The apps reach it with
  the managed identity named by `DataProtection:ClientId`, which already holds Storage Blob Data
  Contributor on the account.
- **Wrapped by Key Vault.** `DataProtection:KeyId` names an RSA key in `kvpopkin{suffix}`, a vault
  with role-based access; the identity holds Key Vault Crypto User on it, enough to wrap and
  unwrap and nothing else.
- **Keys roll on the default 90 days.** A retired key still reads what it protected until it is
  removed, so a token issued the day before a roll outlives it; the token's own 90 days stay the
  limit (L2-168 AC5).
- **Development keeps the default.** Without `DataProtection:BlobUri` the ring stays where ASP.NET
  Core puts it on the machine, which is enough for one developer running both apps. Outside
  Development, without it, the Worker sends no notification email: the unsubscribe link it would
  put in every email could not be read by the API.

## Consequences

- `infra/main.bicep` adds the `dataprotection` container, the vault, its key and the role
  assignment, and sets the three `DataProtection` settings on both apps; `docs/deployment.md`
  lists them in place of `DataProtection:KeysPath`.
- A restart or a new revision no longer signs anyone out, and an unsubscribe link keeps working
  across deployments for its 90 days.
- Deleting the blob, the vault or its key invalidates every outstanding unsubscribe link and
  every protected cookie at once; the vault keeps soft delete and purge protection on for that
  reason.
- Tests are unchanged: the API and Worker tests run in one process, where the default ring is
  shared.
