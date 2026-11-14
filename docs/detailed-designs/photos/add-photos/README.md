# Add photos

## Overview

Popkin is a platform for pop-up communities. Each Popkin has one shared photo album, called
Photos (L1 Terms), that every member can add to and browse. This feature covers adding photos to
that album. A member chooses up to 20 photos from their device, or takes one with the camera,
gives each an optional caption, and uploads them. The other members see the new photos without
reloading.

- **album** — the Popkin's shared set of photos, shown on the Photos tab
- **upload item** — one chosen file in the add-photos dialog, with its preview, caption and
  upload state
- **display image** — the stored copy of a photo: a JPEG whose longest edge is at most 2048 px,
  turned upright, with location and device metadata removed
- **original** — a JPEG of the photo at the size it was added, turned upright, with location and
  device metadata removed, which "Save photo" saves (L2-036 AC1). The file the member chose is
  not kept.
- **thumbnail** — smaller JPEG copy, longest edge at most 480 px, made at upload, served in
  lists (L2-055 AC4)
- **Photo store** — object storage that holds the files; the Popkin database holds only their
  keys and facts

Each photo travels in its own request. One failure therefore never loses the others (L2-031 AC5),
and the dialog can count progress as "Uploading 2 of 3". The browser checks type, size and caption
length before upload so the member sees problems at once. The API checks again from the file's
content, whatever its name says (L2-052 AC3).

## Description

### Screens and states

- `docs/mocks/dialogs/add-photos/default.html` — "Add photos", the line "JPEG, PNG, WebP or HEIC,
  up to 10 MB each. Location data is removed.", three photos with "Caption for photo n" and
  "Add 3 photos".
- `docs/mocks/dialogs/add-photos/invalid.html` — one photo marked "This file is 14 MB. Photos can
  be up to 10 MB."; the action reads "Add 2 photos" (L2-031 AC2).
- `docs/mocks/dialogs/add-photos/busy.html` — rows "Uploading", the bar "Uploading 2 of 3" and a
  disabled "Adding…" (L2-031 AC4).
- `docs/mocks/dialogs/add-photos/failed.html` — the alert "One photo didn't upload. The other two
  are in the album.", the failed row with "Didn't upload. Try again", and "Done" (L2-031 AC5).
- `docs/mocks/pages/photo-album/default.html` — the "Add photos" button that opens the picker;
  `docs/mocks/pages/photo-album/empty.html` and `no-results.html` offer "Add photos" too.

No mock shows the message when more than 20 files are chosen, nor the caption counter near
200 characters. With more than 20 chosen, the dialog holds the first 20 under "You can add 20
photos at a time. The first 20 are here; add the other N next." The count of a caption shows
from 180 characters.

### API

- `POST /api/popkins/{popkinId}/photos` — `multipart/form-data` with `file` and an optional
  `caption`. `201 Created` with `PhotoSummaryDto` (id, caption, uploader with membership id,
  first name and avatar, `TakenAt`, `AddedAt`, thumbnail address, `Width`, `Height`, `IsMine`)
  and a `Location` of the photo. Errors: `400 photo_type_not_allowed`, `400 photo_too_large`
  (over 10 MB), `400 caption_too_long`, `400 validation_failed` for a request without a file
  (each naming the field, L2-052 AC1), `404 popkin_not_found` without a session's membership
  (L2-051 AC1), `409 popkin_wrapped_up` (L2-045 AC2), `429 rate_limited`
  ([Abuse limits](../../security/abuse-limits/README.md)). The checks run in this order:
  membership, wrapped up, caption, missing file, size, type. The request size limit is 20 MB,
  twice the largest photo, so a file a little over 10 MB is answered with `photo_too_large` and
  not cut off; a body over 20 MB is `413 request_too_large`, since journey 13
  ([Input validation and encoding](../../security/input-validation-and-encoding/README.md)).
- `GET /api/popkins/{popkinId}/photos/summary` — the Popkin home's photos summary, which
  answered empty until this journey, now gives the latest 8 photos
  ([Popkin home](../../popkins/popkin-home/README.md)).
- `PopkinHub` event `PhotosAdded(popkinId, photoIds)` to the Popkin's group.

### Frontend

- **`AddPhotosDialog`** — introduced, `dialogs/add-photos/add-photos.dialog.ts`, opened with the
  CDK `Dialog` from `PhotoAlbumPage` after the device's picker, with the chosen `File` list. It
  holds one row per file. Each row is a `pk-upload-item`
  (`docs/design-system/components/upload-item.html`): the preview, the caption field
  (`maxlength` 200, with a count from 180) and the row's state. Above the rows sits `pk-alert`
  for the outcome. The footer holds `pk-progress` and `pk-button`. The frame is `pk-dialog`: a
  bottom sheet under 640 px, focus held inside, and Escape closes it (L2-057 AC2, L2-058 AC4).
  The action is disabled and reads "Adding…" while uploads run (L2-056 AC3). The dialog closes
  itself when every photo is added; it stays, with "Done", when one was refused or failed.
- **`photo-rules`** — pure helpers in the `api` library: at most 20 files; types `image/jpeg`,
  `image/png`, `image/webp`, `image/heic`; at most 10 MB; captions at most 200 characters, with
  the count from 180. They give the reason shown on an invalid row, the wording of the action
  ("Add 3 photos") and the outcome alert.
- **`PhotoUploads`** — introduced in the `api` library. It uploads one photo at a time and
  reports progress. A failed photo is kept with "Try again"; a refusal by the server marks its
  row with the reason; `popkin_wrapped_up` stops the rest.
- **`PhotosApi` / `PHOTOS_API` / `HttpPhotosApi`** — gains `upload(popkinId, file, caption)`,
  which posts with `reportProgress` and emits progress and the added photo. The real-time
  client gains `photosAdded$`.
- **`PhotoAlbumPage`** — the "Add photos" action is a `pk-fab` in the `[slot=fab]` of
  `pk-app-screen`. It opens `pk-files-input`, the device's picker for several files (it has no
  design-system page, since it draws nothing). On a phone the device's picker also offers the
  camera. `AlbumStore` reads the album again, quietly, on `PhotosAdded` (L2-031 AC7).

### Backend

- **`PhotosController`** — introduced, `/api/popkins/{popkinId}/photos`. It binds the form,
  carries the request size limit and the `photos` rate limit policy, and sends
  `AddPhotoCommand`.
- **`AddPhotoCommand` / `AddPhotoCommandHandler`** — introduced. There is no validator class:
  the handler checks and throws, as every handler does. It takes these steps:
  1. Loads the caller's membership through `IMembershipGuard`.
  2. Refuses a wrapped-up Popkin.
  3. Checks the caption, that a file came, and its size.
  4. Passes the file to `IPhotoProcessor`, which refuses a type that is not allowed.
  5. Writes the display image, the thumbnail and the original to `IPhotoStore` under a random
     key that cannot be guessed (L2-051 AC2): `popkins/{popkinId}/{random}.jpg` and the same key
     ending `-thumbnail.jpg` and `-original.jpg`.
  6. Inserts the `Photo` and saves.

  When the save fails, the handler deletes the files it wrote. On success it pushes
  `PhotosAdded` through `IPopkinNotifier`.
- **`IPhotoProcessor`** — in `Popkin.Application.Abstractions`, implemented in Infrastructure by
  `MagickPhotoProcessor` on Magick.NET, the library that already makes avatars. It reads the
  type from the file's bytes and refuses anything but JPEG, PNG, WebP or HEIC; HEIC is decoded
  by the same library. It reads the capture time, then makes three JPEG files at quality 85,
  turned upright, with all metadata removed (L2-031 AC6) and never enlarged: the original, at
  the size it was added, the display image, longest edge 2048 px, and the thumbnail, longest
  edge 480 px. The file the member chose is not kept. A photo of a message is stored the same way.
- **`IPhotoStore`** — `PutAsync`, `DeleteAsync` and `GetReadUrlAsync`, as settled by
  [Join a Popkin](../../invitations/join-popkin/README.md): a read address is signed by
  `PhotoUrlSigner`, expires after one hour and is not tied to a session. In Development the
  store is `LocalPhotoStore`. The store of a deployed system encrypts files at rest
  (L2-054 AC5): it is `BlobPhotoStore`, a private Azure Blob Storage container
  ([ADR 0022](../../../adr/0022-photos-in-azure-blob-storage.md)).
- **Domain** — `Photo` (`Id`, `PopkinId`, `UploaderMembershipId`, `Caption?`, `TakenAt`,
  `AddedAt`, `StorageKey`, `ThumbnailKey`, `OriginalKey?`, `Width`, `Height`, `ContentType`;
  `OriginalKey` is null for a photo stored before journey 14). `TakenAt` is the
  capture time, EXIF `DateTimeOriginal` with `OffsetTimeOriginal` (a time without an offset is
  read as UTC), or `AddedAt` when the file has none. A capture time later than `AddedAt` is a
  camera clock that is wrong, so `TakenAt` is then `AddedAt`. `IAppDbContext` gains
  `DbSet<Photo>`; `PhotoConfiguration` maps it with the index `(PopkinId, TakenAt, Id)`; the
  migration is `AddPhotos`.
- **Rate limit** — the `photos` policy: 60 uploads per person per minute, refused attempts
  counted ([Abuse limits](../../security/abuse-limits/README.md)).
- **Logging** — no photo content or caption is logged (L2-054 AC3).

### Open questions

- Photo store provider for a deployed system: settled by [ADR 0022](../../../adr/0022-photos-in-azure-blob-storage.md), Azure Blob Storage (known gap 9).
"Save photo" needs the photo at the size it was added (L2-036 AC1): settled in journey 14 by
storing the original beside the display image and the thumbnail.

Settled while building: the rate limit on uploads (60 per person per minute), the message when
more than 20 files are chosen, the imaging library (Magick.NET, with HEIC), and the sizes and
format of the stored files.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-031` | `L1-009` | Add photos: Any member adds photos to the album. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |
| `L2-054` | `L1-012` | Personal data is protected: Phone numbers, emails, messages and photos are handled as private data. |

From `L2-045` this feature enforces AC2 and AC3 for photos. From `L2-052` it enforces AC1 and AC3,
and from `L2-054` AC3 and AC5.

## Diagrams

### System context

A member picks or takes photos on their device and adds them to the Popkin's album.

![C4 system context for adding photos](diagrams/c4-context.png)

### Containers

The web app uploads each photo to the Popkin API. The API writes the files to the Photo store and
the record to the Popkin database, then tells other members over SignalR.

![C4 container view for adding photos](diagrams/c4-container.png)

### Components

`AddPhotosDialog` checks files with `photo-rules` and uploads through `PhotoUploads` and
`PhotosApi`.
`AddPhotoCommandHandler` uses `IPhotoProcessor` and `IPhotoStore`, inserts the `Photo` and
notifies.

![C4 component view for adding photos](diagrams/c4-component.png)

### Class structure

The dialog holds up to 20 upload rows and depends on the `PhotosApi` contract. On the server
the handler creates a `Photo` from the two files `IPhotoProcessor` makes.

![Class diagram for adding photos](diagrams/class-structure.png)

### Behaviour — choose photos and captions

The dialog marks each file that breaks a rule with its reason. Only the valid photos are counted
in the action (L2-031 AC1, AC2, AC3).

![Sequence diagram for choosing photos](diagrams/sequence-choose-photos.png)

### Behaviour — upload photos to the album

Photos upload one at a time with progress. The server checks the real file type, removes
metadata and stores the files. A failed photo stays in the dialog with "Try again" while the
others reach the album (L2-031 AC4, AC5, AC6).

![Sequence diagram for uploading photos](diagrams/sequence-upload-photos.png)

### Behaviour — new photos appear for other members

A member with Photos open receives `PhotosAdded`, and `AlbumStore` reads the album again
quietly and merges the answer in album order, so new photos appear without a reload of the
screen (L2-031 AC7). The same read follows a reconnect. The Popkin home shows new photos the
same way.

![Sequence diagram for new photos appearing](diagrams/sequence-photos-appear.png)
