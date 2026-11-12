# Save a photo

## Overview

Popkin is a free platform for pop-up communities. Members of a Popkin share photos in an album
and open each one in the [photo view](../view-photo/README.md). This feature covers keeping and
removing photos. "Save photo" downloads the photo at the size it was added. The member who added
a photo may delete it after confirming, and the Host may delete any photo. Deleting a photo
removes it from the album and deletes its reactions and comments. Every chat message that carried
it then reads "Photo removed".

- **original** — the stored file at the size it was added, with location and device metadata
  removed at upload ([add photos](../add-photos/README.md))
- **download address** — signed Photo store address that expires and makes the browser save the
  file as an attachment
- **uploader** — member who added the photo (`Photo.UploaderMembershipId`)
- **Host** — member who started the Popkin (`MemberRole.Host`)
- **photo actions** — menu on the photo view that offers delete to the uploader and the Host

The download never passes through the Popkin API. The API checks membership and hands back a
short-lived address. The browser then fetches the file straight from the Photo store (L2-051 AC2).
In a wrapped-up Popkin whose album is kept, saving still works (L2-045 AC3).

## Description

### Screens and states

- `docs/mocks/pages/photo-view/default.html` — "Save photo" as an icon button in the top bar.
- No mock shows the photo actions, the delete confirmation, a failed save or delete, or a chat
  message that reads "Photo removed". These are `<TO SUPPLY>`; L2-036 AC2 and AC3 need them.

### API

- `GET /api/popkins/{popkinId}/photos/{photoId}/download` — `200 OK` with `PhotoDownloadDto`
  (`Url`, `ExpiresAt`). Errors: `404 popkin_not_found` (L2-051 AC1), `404 photo_not_found`.
- `DELETE /api/popkins/{popkinId}/photos/{photoId}` — `204 No Content`. Errors:
  `404 popkin_not_found`, `404 photo_not_found`, `403 photo_not_yours` when the caller is neither
  the uploader nor the Host (L2-036 AC2, L2-051 AC4).
- `PopkinHub` event `PhotoDeleted(popkinId, photoId)` on `popkin:{popkinId}`.

### Frontend

- **`PhotoViewPage`** — from [view a photo](../view-photo/README.md). This feature adds three
  actions:
  - `save()` — calls `PhotosApi.getDownload`, then activates a temporary link to the address.
    "Save photo" is disabled while the request runs (L2-056 AC3). A failure shows a danger
    `pk-toast` that stays until dismissed (L2-056 AC7).
  - `openActions()` — offered when `CanDelete` is true.
  - `delete()` — asks for confirmation in a CDK dialog, deletes, then opens the album.
- **`PhotosApi`** — gains `getDownload(popkinId, photoId)` and `deletePhoto(popkinId, photoId)`.
- **Real-time** — `PhotoAlbumPage` drops a deleted photo on `PhotoDeleted`.
  [Browse the album](../browse-album/README.md) describes that page. The chat pages show
  "Photo removed" in place of the photo of an affected message.

### Backend

- **`PhotosController`** — gains `GET …/download` and `DELETE …/{photoId}`.
- **`GetPhotoDownloadQuery` / `GetPhotoDownloadQueryHandler`** — introduced. It checks membership
  through `IMembershipGuard`, loads the `Photo` scoped to the Popkin, and asks
  `IPhotoStore.GetDownloadUrlAsync` for an attachment address of the original. The file name and
  the address lifetime are `<TO SUPPLY>`.
- **`DeletePhotoCommand` / `DeletePhotoCommandHandler`** — introduced. It checks membership and
  calls `Photo.CanBeDeletedBy(membership)`, which allows the uploader and the Host. In one unit of
  work it takes these steps:
  1. Deletes the photo's `PhotoReaction` and `PhotoComment` rows.
  2. Marks every `Message` that carried the photo.
  3. Deletes the `Photo`.

  After the commit it deletes the original and thumbnails through `IPhotoStore.DeleteAsync` and
  pushes `PhotoDeleted` through `IPopkinNotifier`. A file that fails to delete is logged without
  its content. How orphaned files are cleaned up is `<TO SUPPLY>`.
- **`IPhotoStore`** — gains `GetDownloadUrlAsync(key, fileName, ttl)`.
- **Domain** — this design adds `Message.PhotoRemoved` (bool). Deleting a photo sets it to true
  and sets `Message.PhotoId` to null, so the chat can tell "Photo removed" apart from a message
  that never had a photo (L2-036 AC3). `Photo` gains `CanBeDeletedBy(Membership)`.

### Open questions

- Mocks for the photo actions, the delete confirmation, failures and "Photo removed":
  `<TO SUPPLY>`.
- Whether photos may be deleted after the Popkin wraps up: `<TO SUPPLY>`. L2-045 lists no delete.
- File name of a saved photo and lifetime of the download address: `<TO SUPPLY>`.
- Cleanup of files whose deletion failed, for example by a `Popkin.Worker` job: `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-036` | `L1-009` | Save a photo: Members keep the photos they want. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

## Diagrams

### System context

A member saves photos of a Popkin they belong to. The uploader or the Host deletes them.

![C4 system context for saving a photo](diagrams/c4-context.png)

### Containers

The web app asks the Popkin API for a download address and fetches the file from the Photo store.
Deletion goes through the API, which updates the database, removes the files and tells the other
members.

![C4 container view for saving a photo](diagrams/c4-container.png)

### Components

`PhotosController` dispatches to `GetPhotoDownloadQueryHandler` and `DeletePhotoCommandHandler`.
Both use `IPhotoStore`; the delete handler also notifies through `SignalRPopkinNotifier`.

![C4 component view for saving a photo](diagrams/c4-component.png)

### Class structure

A `Photo` owns its reactions and comments and decides who may delete it. A `Message` references
a photo and records when it was removed.

![Class diagram for saving a photo](diagrams/class-structure.png)

### Behaviour — save a photo to the device

The page asks for a download address and hands it to the browser. The browser saves the original
at the size it was added (L2-036 AC1).

![Sequence diagram for saving a photo](diagrams/sequence-save-photo.png)

### Behaviour — delete a photo

Only the uploader or the Host may delete. The handler removes the reactions, comments and photo,
marks the chat messages, deletes the files and tells every member (L2-036 AC2, AC3).

![Sequence diagram for deleting a photo](diagrams/sequence-delete-photo.png)
