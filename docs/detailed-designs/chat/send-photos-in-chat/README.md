# Send photos in chat

## Overview

Members of a *Popkin* talk in the shared *Everyone* thread and in *direct messages*, and keep the
group's pictures in *Photos*, the Popkin's shared album. This feature lets a chat message carry one
photo, with or without text, and decides when such a photo also lands in the album.

- **photo message** — chat message whose `PhotoId` names a stored photo; it may also carry text
- **chat mode** — the way the Add photos dialog behaves when opened from the composer: one photo, handed back to the composer instead of added to the album
- **photo preview** — the chosen photo shown above the message field, with a "Remove photo" action, before it is sent
- **expiring address** — short-lived, unguessable URL for a photo file, issued only to members who may see it

A member chooses "Photo" in the composer, picks a photo from the device or takes one, sees it above
the message field and sends it with or without text. The photo shows at most 16 rem wide at a 4:3
ratio with any text under it, and opens full screen when chosen. A photo sent in Everyone is also
added to Photos under the sender's name; a photo sent in a direct message stays private to its two
members. The limits of the album apply: JPEG, PNG, WebP or HEIC, at most 10 MB, with location and
device data removed.

## Description

**Screens and states:**

- `docs/mocks/pages/group-chat/default.html` — a photo message from Dev ("Dock was glass this morning") and the composer's "Photo" action.
- `docs/mocks/dialogs/add-photos/default.html` — the dialog, with "JPEG, PNG, WebP or HEIC, up to 10 MB each. Location data is removed."
- `docs/mocks/dialogs/add-photos/invalid.html` — "This file is 14 MB. Photos can be up to 10 MB." (L2-031 AC2).
- `docs/mocks/dialogs/add-photos/busy.html`, `failed.html` — album-mode upload progress and partial failure; in chat mode the upload happens on send, so these states do not apply there.
- The mocks draw the dialog in album mode only: several photos, a caption per photo and "Add 3 photos". The chat-mode layout, its confirm label and the photo preview above the message field with "Remove photo" (L2-026 AC1) are not drawn; those mock states are `<TO SUPPLY>`.

**API:**

- `POST /api/popkins/{popkinId}/threads/{threadId}/photos` (multipart, one file) — 201 `PhotoUploadedDto`; 400 `photo_type_not_allowed`, `photo_too_large`; 404 `popkin_not_found`, `thread_not_found`; 409 `popkin_wrapped_up`; 413 when the request body exceeds the server limit. The two photo codes should match the ones photos/add-photos chooses; alignment is `<TO SUPPLY>`.
- `POST /api/popkins/{popkinId}/threads/{threadId}/messages` with `photoId` — as in send-message-to-everyone, plus 400 `photo_not_found` when the photo is not the caller's upload in this Popkin.

**Frontend (Popkin web app):**

- **`AddPhotosDialog`** — `dialogs/add-photos/add-photos.dialog.ts`, shared with photos/add-photos. Data `AddPhotosDialogData { mode: 'album' | 'chat'; max: number }`. In chat mode `max` is 1 and the dialog checks each file's type by its leading bytes and its size before closing, marking a refused file with its reason (L2-026 AC4, L2-031 AC2). It closes with the `File`. Whether chat mode keeps a caption field is `<TO SUPPLY>`; a caption would duplicate the message text.
- **Picking or taking** — the dialog uses a file input with `accept="image/jpeg,image/png,image/webp,image/heic"`; on a phone the platform picker offers the camera, so no camera permission is requested.
- **`pk-composer`** — shows the photo preview with an object URL and "Remove photo" (L2-026 AC1). Send is enabled when there is text or a photo.
- **`MessageOutbox.enqueue(threadId, text?, photo?, replyTo?)`** — uploads the photo with `ChatApi.uploadThreadPhoto`, keeps the returned `photoId` on the entry, then sends the message. A retry after a successful upload reuses the `photoId` and does not upload again (failed-messages). While queued, the photo blob is kept in `OutboxStorage`.
- **`pk-message`** — shows the photo at most 16 rem wide at 4:3 (`object-fit: cover`) with any text under it, with the photo's alt text (L2-026 AC2). The source of chat-photo alt text is `<TO SUPPLY>`; the mock uses a written description. Choosing the photo opens `pk-photo-viewer` full screen.

**Backend:**

- **`ThreadsController.UploadPhoto`** — `[RequestSizeLimit]` of 10 MB plus multipart overhead (overhead `<TO SUPPLY>`), and sends `UploadThreadPhotoCommand`.
- **`UploadThreadPhotoCommandValidator`** — validator: one file, at most 10 MB, content signature JPEG, PNG, WebP or HEIC whatever its name or declared type says (L2-052 AC3).
- **`UploadThreadPhotoCommandHandler`** — membership, `ChatThread.CanRead`, `PopkinSpace.EnsureActive()`. It passes the stream to `IImageSanitizer`, which removes location and device data and reads width, height and the capture time (L2-031 AC6), then writes the cleaned file through `IPhotoStore.PutAsync` and inserts a `Photo`. In Everyone, `DirectThreadId` is null: the photo is in the album under the uploader and `IPopkinNotifier.PhotoAdded` reaches members with Photos open (L2-026 AC3, L2-031 AC7). In a direct thread, `DirectThreadId` is the thread's id and the photo is not in the album.
- **`Photo.DirectThreadId`** — addition to the shared `Photo` entity. The album query of the photos subsystem shall filter `DirectThreadId == null`, and the photo file endpoint shall apply `ChatThread.CanRead` to a photo that has one (L2-051 AC2).
- **`IImageSanitizer`** / **`ImageSanitizer`** — abstraction in `Popkin.Application.Abstractions` and implementation in Infrastructure, shared with photos/add-photos. The imaging library and HEIC handling are `<TO SUPPLY>`.
- **`IPhotoStore`** / **`ObjectStoragePhotoStore`** — shared abstraction; `GetReadUrl` issues the expiring address that `MessageDto.PhotoUrl` carries (L2-051 AC2). The provider is `<TO SUPPLY>`; files are encrypted at rest (L2-054 AC5).
- **Orphans** — an uploaded photo whose message is never sent stays unreferenced. Removing such photos after a period is `<TO SUPPLY>`; a `Popkin.Worker` job is the expected home.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-026` | `L1-007` | Send photos in chat: A message carries a photo with or without text. |
| `L2-031` | `L1-009` | Add photos: Any member adds photos to the album. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |

## Diagrams

### System context

A member sends a photo through Popkin, picking it from the device or taking it with the camera that
the browser's file input reaches.

![C4 system context for sending photos in chat](diagrams/c4-context.png)

### Containers

The web app uploads the photo to the Popkin API and then posts the message. The API writes the
cleaned file to the Photo store and the `Photo` and `Message` rows to the Popkin database.

![C4 container view for sending photos in chat](diagrams/c4-container.png)

### Components

The thread page opens `AddPhotosDialog` in chat mode and sends through `MessageOutbox`, which calls
the thread photo endpoint and then the messages endpoint. `UploadThreadPhotoCommandHandler` writes
through `IPhotoStore` and publishes `PhotoAdded` for Everyone only.

![C4 component view for sending photos in chat](diagrams/c4-component.png)

### Class structure

`UploadThreadPhotoCommandHandler` depends on `IImageSanitizer` and `IPhotoStore` and creates a
`Photo`, whose `DirectThreadId` keeps direct-message photos out of the album. A `Message` refers to
at most one `Photo`. On the client, `AddPhotosDialog` returns the file that becomes the composer's
photo and `MessageOutbox` sends it.

![Class diagram for sending photos in chat](diagrams/class-structure.png)

### Behaviour — pick a photo

The dialog in chat mode accepts one photo and refuses a wrong type or a file over 10 MB with its
reason; an accepted photo appears above the message field with "Remove photo".

![Sequence diagram for picking a photo for a message](diagrams/sequence-pick-photo.png)

### Behaviour — send a message with a photo

The outbox uploads first, then sends the message with the returned `photoId`. A photo sent in
Everyone joins the album (L2-026 AC3); a failure leaves the message "Not sent" and a retry reuses a
completed upload.

![Sequence diagram for sending a message with a photo](diagrams/sequence-send-photo-message.png)
