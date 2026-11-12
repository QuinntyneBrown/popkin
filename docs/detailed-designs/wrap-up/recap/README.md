# Recap

## Overview

A Popkin is a private space for one group, and every Popkin ends. When it wraps up, its members
get a recap: a send-off page that says the Popkin wrapped up, names it, gives the dates it ran,
shows three of its photos and its emoji, counts the people, messages and photos, and names the
top-rated moment.

**recap** — summary of a wrapped-up Popkin: its people, messages, photos and top-rated moment

**top-rated moment** — experience of the Popkin with the highest group score, shown with its
score and the member who shared it

**album export** — zip file of every photo in a Popkin, prepared on request and downloaded once
ready

The recap is the front page of a wrapped-up Popkin (L2-045 AC5) and the destination of the
"Recap" entries in My Popkins (L2-018 AC2). It also looks forward. A member who is not the Host
can choose "Start your own Popkin"; the Host can choose "Pop up another with this crew", which
starts a new Popkin and sends its invite to every member of the old one. When the album was kept,
"Save the album" prepares a zip of every photo and downloads it.

## Description

### Screens and states

- `docs/mocks/pages/wrapped-up/default.html` — a member's recap: "This Popkin wrapped up. What a
  time.", "Lakeside Weekend · Fri 11 – Sun 13 Sep", three photos and the emoji, "14 people showed
  up" with avatars, the stats "1,286 messages sent" and "48 photos shared", the "Top-rated
  moment" card, "Save the album", "Start your own Popkin" and "Read the chat" (L2-046 AC1, AC2,
  AC3, AC4, AC6).
- `docs/mocks/pages/wrapped-up/host.html` — the Host's recap, with "Pop up another with this
  crew" in place of "Start your own Popkin" (L2-046 AC5).
- `docs/mocks/pages/wrapped-up/loading.html` — "Loading the recap…" with skeletons (L2-056 AC1).
- `docs/mocks/pages/wrapped-up/error.html` — "We couldn't load the recap" with "Try again" and
  "My Popkins" (L2-056 AC2).
- `docs/mocks/notifications/banner/persistent.html` — the recap with "Photos go in 12 days. Save
  the album to keep them." when the album was not kept (L2-045 AC4).
- `docs/mocks/pages/name-your-popkin/default.html` and `docs/mocks/pages/name-your-popkin/blank.html`
  — the screens "Pop up another with this crew" and "Start your own Popkin" open (owned by
  [Start a Popkin](../../popkins/start-popkin/README.md)).

The progress shown while the album export is prepared (L2-046 AC4) has no mock; its state on
`wrapped-up` is `<TO SUPPLY>` and comes before implementation. The design uses `pk-progress` with
a count, as in the design system's progress component.

The manifest marks the recap's empty state as not applicable: a wrapped-up Popkin always has its
people and dates, and the top-rated card is left out when nothing was rated (L2-046 AC3).

### API

- `GET /api/popkins/{popkinId}/recap` — `200 OK` with `RecapDto`.
  - `404` `popkin_not_found` — not a member (L2-051 AC1).
  - `409` `popkin_active` — the Popkin has not wrapped up; the web app opens the Popkin home.
- `POST /api/popkins/{popkinId}/recap/album-exports` — `202 Accepted` with `AlbumExportDto`
  and a `Location` header.
  - `404` `popkin_not_found`; `409` `album_not_kept` when the album was not kept and has been
    removed; `409` `popkin_active`.
- `GET /api/popkins/{popkinId}/recap/album-exports/{exportId}` — `200 OK` with `AlbumExportDto`
  (`status`, `photosDone`, `photosTotal`, `downloadUrl` once ready). `404` `popkin_not_found` or
  `export_not_found`.
- `POST /api/popkins/{popkinId}/crew-invites` with `{ "fromPopkinId": "…" }` — `202 Accepted`.
  Sent by the web app once the new Popkin exists.
  - `403` `host_only` — the caller is not the Host of both Popkins (L2-051 AC4).
  - `404` `popkin_not_found`; `409` `popkin_active` when the old Popkin has not wrapped up.

### Backend — Popkin API

- **`RecapController`** (`/api/popkins/{popkinId}/recap`) — introduced; actions `Get`,
  `StartAlbumExport` and `GetAlbumExport`. Each sends one MediatR request and maps the result.
- **`PopkinsController`** — introduced action `InviteCrew` on
  `POST /api/popkins/{popkinId}/crew-invites`.

### Backend — Popkin Application and Domain

- **`GetRecapQuery`** / **`GetRecapQueryHandler`** — calls `IMembershipGuard.RequireMemberAsync`,
  throws `PopkinActiveException` when `Status` is `Active`, then reads the counts in one round
  trip per figure:
  - `PeopleCount` — every `Membership` of the Popkin, including members who left, because they
    showed up. Confirmation of this rule: `<TO SUPPLY>`.
  - `MessageCount` — `Message` rows of kind `Member` in every thread of the Popkin. Whether direct
    messages count: `<TO SUPPLY>`.
  - `PhotoCount` — `Photo` rows of the Popkin. After the album is removed (L2-045 AC4) the count
    shown is `<TO SUPPLY>`.
  - `Photos` — three photos with read URLs from `IPhotoStore`; the selection rule is
    `<TO SUPPLY>`. Empty after the album is removed.
  - `Avatars` — up to four members for the avatar stack, Host first.
  - `TopRated` — the experience with the highest average of `ExperienceRating.Stars`, ties broken
    by more ratings, then the earlier `SharedAt`; `null` when no experience is rated, and the card
    is not shown (L2-046 AC3).
  - `StartedAt` (`PopkinSpace.CreatedAt`), `WrappedUpAt`, `KeepPhotos`, `PhotosRemoveAt` and
    `IsHost`.
- **`RecapDto`** — the fields above plus `Name`, `Emoji`, `Colour`. **`TopRatedDto`** —
  `ExperienceId`, `Title`, `Score` (one decimal), `SharedByName`.
- **`AlbumExport`** (entity, introduced) — `Id`, `PopkinId`, `RequestedByMembershipId`, `Status`:
  `AlbumExportStatus` {Preparing, Ready, Failed}, `PhotosTotal`, `PhotosDone`, `StorageKey?`,
  `RequestedAt`, `ExpiresAt?`.
- **`StartAlbumExportCommand`** / **`…Handler`** — guard, then checks the album exists; reuses a
  `Ready` export of the same Popkin that has not expired, otherwise creates an `AlbumExport` with
  `Status = Preparing` and `PhotosTotal` set.
- **`GetAlbumExportQuery`** / **`…Handler`** — guard, then returns the export's progress and,
  when `Ready`, a download URL from `IPhotoStore.GetReadUrl(storageKey, lifetime)`. The URL
  expires (L2-051 AC2); its lifetime is `<TO SUPPLY>`.
- **`InviteCrewCommand`** / **`InviteCrewCommandHandler`** — `RequireHostAsync` on both the new
  and the old Popkin; for every membership of the old Popkin that has not left, other than the
  Host's, whose person still has an account, sends the new Popkin's invite. The delivery channel
  (an in-app invitation, the phone number or email the person signs in with, or both) is
  `<TO SUPPLY>` (L2-046 AC5).

### Backend — Popkin Worker

- **`PrepareAlbumExportsJob`** — introduced `BackgroundService`. It picks up `Preparing` exports,
  streams each photo from `IPhotoStore` into a zip written back to the photo store, updates
  `PhotosDone` after each photo and sets `Ready` with `ExpiresAt`, or `Failed`. Export retention
  and the zip size limit are `<TO SUPPLY>`.

### Frontend — Popkin web app

- **`WrappedUpPage`** (`pages/wrapped-up/wrapped-up.page.ts` and `.html`, selector
  `pk-wrapped-up-page`) — introduced. Route `/p/:popkinId/recap`, data `{ shell: 'bare', page:
  'wrapped-up' }`, behind `signedInGuard` and `memberGuard`. It loads the recap through
  `RECAP_API` and composes `pk-top-bar` (My Popkins), `pk-popkin-tile`, the photo collage,
  `pk-avatar` stack, `pk-stat` pair, `pk-card` (top-rated moment, linking to the experience),
  `pk-banner` (photos-go warning), `pk-progress`, `pk-skeleton`, `pk-empty-state` and
  `pk-button`s. Counts use `Intl.NumberFormat` with grouping, so "1,286" carries its thousands
  separator (L2-046 AC2). Dates use the locale's short weekday and day ("Fri 11 – Sun 13 Sep").
  - "Save the album" starts the export, then polls `getAlbumExport` every second and shows
    `pk-progress` with "Preparing {done} of {total}". When `Ready` it starts the download from
    `downloadUrl` (L2-046 AC4). A failure shows a `pk-toast` (danger) with "Try again". The
    button is shown only when the album is kept or not yet removed.
  - "Pop up another with this crew" (Host) navigates to `/new?crew={popkinId}`. The start-popkin
    flow sends `crewInvites` after creating the new Popkin (L2-046 AC5).
  - "Start your own Popkin" (member) navigates to `/new` (L2-046 AC6).
  - "Read the chat" navigates to `/p/:popkinId/chat/everyone`.
- **`RecapApi`** / **`RECAP_API`** / **`HttpRecapApi`** (`frontend/projects/api/src/lib/api/`) —
  introduced: `getRecap`, `startAlbumExport`, `getAlbumExport`. View models `RecapView`,
  `AlbumExportView`.
- **`PopkinsApi.inviteCrew(newPopkinId, fromPopkinId)`** — introduced method used by
  `NameYourPopkinPage` after creation.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-046` | `L1-011` | Recap: The recap is the send-off. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

`L2-051` is listed because the recap and its album export are refused to non-members with `404`
(AC1), the download address expires (AC2), and only the Host may invite the crew (AC4).

## Diagrams

### System context

Members and the Host open the recap through Popkin. The crew invite may reach members through the
SMS or email provider, depending on the channel still to be decided.

![C4 system context for the recap](diagrams/c4-context.png)

### Containers

The web app reads the recap from the Popkin API. The Popkin Worker prepares the album zip in the
photo store, and the browser downloads it from there.

![C4 container view for the recap](diagrams/c4-container.png)

### Components

`RecapController` sends `GetRecapQuery`, `StartAlbumExportCommand` and `GetAlbumExportQuery`;
`PrepareAlbumExportsJob` in the Worker writes the zip through `IPhotoStore`.

![C4 component view for the recap](diagrams/c4-component.png)

### Class structure

`RecapDto` aggregates the counts, photos and the optional `TopRatedDto`. `AlbumExport` tracks
the zip's progress.

![Class diagram for the recap](diagrams/class-structure.png)

### Behaviour — open the recap

The handler proves membership, refuses an active Popkin and assembles the counts and the
top-rated moment (L2-046 AC1, AC2, AC3).

![Sequence diagram for opening the recap](diagrams/sequence-open-recap.png)

### Behaviour — save the album

The export is prepared in the Worker while the page shows progress, then downloaded from an
expiring address (L2-046 AC4).

![Sequence diagram for saving the album](diagrams/sequence-save-album.png)

### Behaviour — pop up another with this crew

The Host starts a new Popkin from the recap; once it exists, the web app asks the API to invite
every member of the old one (L2-046 AC5).

![Sequence diagram for popping up another Popkin with the same crew](diagrams/sequence-pop-up-another.png)
