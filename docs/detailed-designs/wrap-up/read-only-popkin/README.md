# Read-only Popkin

## Overview

A Popkin is a private space for one group. Once it wraps up, either because its Host ended it
([The Host wraps up](../host-wraps-up/README.md)) or because its end date arrived
([Time is up](../time-is-up/README.md)), nothing new is added to it. Members keep what the group
made together: they read the chat, browse and save the photos and open the recap. They cannot
post, react, comment, rate, share, add photos or start a call, and nobody can join.

**wrapped-up Popkin** — Popkin whose `PopkinSpace.Status` is `WrappedUp`

**write request** — API request that adds or changes content in a Popkin: a message, a photo, an
experience, a rating, a comment, a reaction, a keen, a call or a join

**album removal date** — instant 30 days after wrap-up at which a Popkin wrapped up without
keeping its album loses its photos

The rule has two halves. The API refuses every write request to a wrapped-up Popkin with `409`
and the code `popkin_wrapped_up`, whichever screen or client sends it. The web app does not offer
the actions in the first place: the chat composer is replaced by a closing line, Photos has no
"Add", and opening the Popkin shows its recap first. This feature defines both halves; the
features that own each write endpoint apply the refusal described here.

## Description

### Screens and states

- `docs/mocks/pages/group-chat/read-only.html` — the Everyone thread with every message readable,
  the subtitle "Wrapped up Sun 13 Sep", no call button, Back labelled "Recap", and the composer
  replaced by "This Popkin has wrapped up. Messages stay, but nobody can post new ones." (L2-045
  AC1).
- `docs/mocks/notifications/banner/persistent.html` — on the recap of a Popkin wrapped up without
  its album, a warning banner "Photos go in 12 days. Save the album to keep them." with a "Save"
  action (L2-045 AC4).
- `docs/mocks/pages/wrapped-up/default.html` — the recap a member sees first when opening a
  wrapped-up Popkin (L2-045 AC5).
- `docs/mocks/pages/join-invite/wrapped.html` — the invite of a wrapped-up Popkin, with no "Join"
  (owned by [Preview an invite](../../invitations/preview-invite/README.md), L2-016).
- Photos of a wrapped-up Popkin (browse and save, no "Add"; the days-left notice; "photos were
  removed") have no mock. The mocks for these `photo-album` states are `<TO SUPPLY>` and come
  before implementation (L2-045 AC3, AC4).

### API

No endpoint is added. Every write endpoint below, owned by the feature named, answers `409`
`popkin_wrapped_up` for a wrapped-up Popkin (L2-045 AC2). A non-member still receives `404`
`popkin_not_found` first, so the `409` never discloses that a Popkin exists (L2-051 AC1).

| Endpoint | Owner |
|----------|-------|
| `POST /api/popkins/{popkinId}/threads/{threadId}/messages` | [Send a message to everyone](../../chat/send-message-to-everyone/README.md) |
| `POST /api/popkins/{popkinId}/threads` (open a direct thread) | [Direct messages](../../chat/direct-messages/README.md) |
| `PUT`/`DELETE .../messages/{messageId}/reactions/{emoji}` | [React to a message](../../chat/react-to-message/README.md) |
| `POST /api/popkins/{popkinId}/photos` | [Add photos](../../photos/add-photos/README.md) |
| `PUT`/`DELETE .../photos/{photoId}/reactions/{emoji}` | [React to a photo](../../photos/react-to-photo/README.md) |
| `POST .../photos/{photoId}/comments` | [Comment on a photo](../../photos/comment-on-photo/README.md) |
| `POST /api/popkins/{popkinId}/experiences` | [Share an experience](../../experiences/share-experience/README.md) |
| `PUT .../experiences/{experienceId}/rating` | [Rate an experience](../../experiences/rate-experience/README.md) |
| `POST .../experiences/{experienceId}/comments` | [Comment on an experience](../../experiences/comment-on-experience/README.md) |
| `PUT .../experiences/{experienceId}/keen` | [Say you are keen](../../experiences/say-keen/README.md) |
| `POST /api/popkins/{popkinId}/calls` and joining a call | [Group call](../../calls/group-call/README.md) |
| `POST /api/invites/{code}/join` | [Join a Popkin](../../invitations/join-popkin/README.md) |
| `PATCH /api/popkins/{popkinId}` (name, look, length) | [Popkin settings](../../popkins/popkin-settings/README.md) |
| `POST /api/popkins/{popkinId}/wrap-up` | [The Host wraps up](../host-wraps-up/README.md) |

Exact paths are those of the owning designs; the table lists them for traceability.

Reads stay open to members: the Popkin, members, threads, messages, photos and their file
addresses, experiences and the recap. Whether a member may still leave a wrapped-up Popkin is
`<TO SUPPLY>`; the settings menu is not reachable once the home redirects to the recap.

### Backend — Popkin Application and Domain

- **`IMembershipGuard.RequireActiveMemberAsync(popkinId)`** — introduced in
  [Membership authorisation](../../security/membership-authorisation/README.md). It first proves
  membership (`PopkinNotFoundException`, `404`), then checks `PopkinSpace.Status` and throws
  `PopkinWrappedUpException` (`409 popkin_wrapped_up`) when it is `WrappedUp`. Every handler of a
  write request calls it as its first step, before any validation of state or any write. Read
  handlers call `RequireMemberAsync`, which does not check the status.
- **Join** — `JoinPopkinCommandHandler` acts for a person who is not yet a member, so it cannot
  use the member guard. It looks the Popkin up by invite code and throws
  `PopkinWrappedUpException` itself when the Popkin is wrapped up (L2-045 AC2).
- **`PopkinWrappedUpException`** (`Popkin.Domain`) — thrown by the guard, by `PopkinSpace.WrapUp`
  and by the join handler. One type and one code keep the refusal uniform.
- **The choice of explicit guard calls** — the design calls the guard in each handler rather than
  in a MediatR pipeline behaviour keyed on a marker interface. The explicit call keeps the order
  "membership, then status" visible in each handler, and each write endpoint's integration test
  proves its `409`.
- **`PopkinSpace`** — gains `PhotosRemovedAt: DateTimeOffset?`, set when the album is removed, so
  Photos can say the photos were removed (L2-045 AC4). `PhotosRemoveAt` (computed, from
  [The Host wraps up](../host-wraps-up/README.md)) gives the removal date while it lies ahead.
- **`RemoveWrappedUpAlbumsCommand`** / **`RemoveWrappedUpAlbumsCommandHandler`** — selects
  Popkins with `Status == WrappedUp`, `KeepPhotos == false`, `PhotosRemovedAt == null` and
  `WrappedUpAt + 30 days <= now`. For each, it deletes every photo file through
  `IPhotoStore.DeleteAsync(storageKey)`, deletes the `Photo`, `PhotoReaction` and `PhotoComment`
  rows and sets `PhotosRemovedAt`. Whether photos sent in chat (L2-026) are removed with the
  album is `<TO SUPPLY>`.

### Backend — Popkin Worker

- **`RemovePhotosOfWrappedUpPopkinsJob`** — introduced `BackgroundService` that sends
  `RemoveWrappedUpAlbumsCommand` on a period of `<TO SUPPLY>` (at most one hour is sufficient for
  a 30-day rule).

### Backend — Popkin API

- **`ProblemDetailsExceptionHandler`** — maps `PopkinWrappedUpException` to `409` ProblemDetails
  with `code: "popkin_wrapped_up"` (see
  [Membership authorisation](../../security/membership-authorisation/README.md)).
- **`PopkinDto`** (from `GET /api/popkins/{popkinId}`) — carries `status`, `wrappedUpAt`,
  `keepPhotos`, `photosRemoveAt` and `photosRemovedAt`, which the web app needs to render the
  read-only states.

### Frontend — Popkin web app

- **`activePopkinGuard`** (`frontend/projects/popkin/src/app/guards/active-popkin.guard.ts`) —
  introduced functional `CanActivateFn` on `/p/:popkinId`. It loads the Popkin through
  `CurrentPopkinStore`; when `status` is `wrappedUp` it returns a `UrlTree` to
  `/p/:popkinId/recap`, so a wrapped-up Popkin shows its recap first (L2-045 AC5). It is placed on
  the home, wrap-up and video-call routes only; chat, photos and experiences stay readable.
- **`GroupChatPage`** and **`DirectMessagePage`** — existing in the chat designs; for a wrapped-up
  Popkin they render `pk-composer` in its closed form with the line "This Popkin has wrapped up.
  Messages stay, but nobody can post new ones.", hide the call button, set the subtitle to
  "Wrapped up {date}" and point Back to the recap (L2-045 AC1). Messages open the actions sheet
  with "Copy" only, since reactions and replies are writes.
- **`PhotoAlbumPage`** and **`PhotoViewPage`** — hide "Add", keep browsing and "Save" (L2-045
  AC3). When `photosRemoveAt` lies ahead they show a `pk-banner` (warning) that says how many days
  are left; when `photosRemovedAt` is set they show a `pk-empty-state` that says the photos were
  removed (L2-045 AC4). Copy for both follows the `photo-album` mocks, which are `<TO SUPPLY>`.
- **`ExperiencesPage`** and **`ExperienceDetailPage`** — hide "Share one", the rating stars,
  "Add a comment" and the keen action for a wrapped-up Popkin; ratings and comments stay readable.
- **`wrappedUpInterceptor`** (`frontend/projects/api/src/lib/api/wrapped-up.interceptor.ts`) —
  introduced `HttpInterceptorFn`. On a `409` whose `code` is `popkin_wrapped_up` it tells
  `CurrentPopkinStore` to reload; the store then moves the member to the recap. This covers a
  member who acts in the moment the Popkin wraps up.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

`L2-051` is listed because the guard proves membership before it checks the status, so the
`409` is never shown to a non-member.

## Diagrams

### System context

Members read a wrapped-up Popkin through Popkin; Popkin refuses anything new.

![C4 system context for a read-only Popkin](diagrams/c4-context.png)

### Containers

The web app hides write actions; the Popkin API refuses write requests; the Popkin Worker removes
an album 30 days after wrap-up when the Host did not keep it.

![C4 container view for a read-only Popkin](diagrams/c4-container.png)

### Components

Every write handler in the Popkin API calls `IMembershipGuard.RequireActiveMemberAsync` first;
`ProblemDetailsExceptionHandler` turns `PopkinWrappedUpException` into `409`. The Worker's job
removes due albums through `IPhotoStore`.

![C4 component view for a read-only Popkin](diagrams/c4-component.png)

### Class structure

`MembershipGuard` returns a `MemberAccess` or throws one of two exceptions; each write handler
(represented by `SendMessageCommandHandler`) depends on it. `PopkinSpace` carries the status and
the album dates.

![Class diagram for a read-only Popkin](diagrams/class-structure.png)

### Behaviour — a write request to a wrapped-up Popkin

A representative write, sending a message, passes the membership check and is refused with
`409 popkin_wrapped_up` (L2-045 AC2). The same order applies to every write endpoint.

![Sequence diagram for a refused write request](diagrams/sequence-refuse-write.png)

### Behaviour — a member opens a wrapped-up Popkin

The guard on the home route redirects to the recap (L2-045 AC5); the chat opens with the closed
composer (L2-045 AC1).

![Sequence diagram for opening a wrapped-up Popkin](diagrams/sequence-open-wrapped-up.png)

### Behaviour — the album is removed

Thirty days after a wrap-up without the album kept, the Worker deletes the photo files and rows
and records the removal (L2-045 AC4).

![Sequence diagram for removing the album of a wrapped-up Popkin](diagrams/sequence-remove-album.png)
