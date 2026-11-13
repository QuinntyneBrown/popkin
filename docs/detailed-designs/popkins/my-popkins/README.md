# My Popkins

## Overview

A person may belong to several Popkins at once: a weekend away, a weekly group, a season of
school sport. *My Popkins* is the signed-in person's starting screen. It lists every Popkin they
belong to, with what is new in each, and leads to a Popkin's home, its recap, a new Popkin, their
account or the scanner that joins another.

- **active Popkin** — Popkin whose `Status` is `Active`; it accepts messages, photos and members
- **wrapped-up Popkin** — Popkin whose `Status` is `WrappedUp`; it is read-only and has a recap
- **unread count** — number of messages in a Popkin that the member has not read and did not send
- **time left** — remaining time before an active Popkin wraps up, or "Ongoing" when it has no end

Active Popkins come first as colour cards, the most recently active at the top. Wrapped-up
Popkins follow in a "Wrapped up" section that leads to each recap. The list contains only the
Popkins the caller belongs to (L2-051 AC3).

## Description

### Screens and states

- `docs/mocks/pages/my-popkins/default.html` — three active cards and two wrapped-up Popkins.
- `docs/mocks/pages/my-popkins/active-only.html` — no "Wrapped up" section (L2-018 AC3).
- `docs/mocks/pages/my-popkins/loading.html` — skeleton cards, "Loading your Popkins…".
- `docs/mocks/pages/my-popkins/empty.html` — "No Popkins yet", "Start a Popkin", "Scan to join".
- `docs/mocks/pages/my-popkins/error.html` — "We couldn't load your Popkins", "Try again".
- `docs/mocks/pages/my-popkins/offline.html` — banner "You're offline. Showing what we saved last
  time." over the saved list.

### API

- `GET /api/popkins` — `200` with `MyPopkinsDto`. Failures: `401` without a session.

### Frontend (Popkin web app)

- **`MyPopkinsPage`** (`pages/my-popkins/my-popkins.page.ts`, route `/popkins`,
  `data-page="my-popkins"`, `signedInGuard`) — composes `pk-top-bar` with `pk-logo` and the
  person's `pk-avatar` (opens `/account`, L2-017 AC5), one `pk-card` per active Popkin, a
  "Wrapped up" list, `pk-button` "New Popkin" (opens `/new`, L2-017 AC4), `pk-empty-state`,
  `pk-skeleton`, `pk-banner` and `pk-alert`. It holds one state signal: `loading`, `ready`,
  `empty` or `error`, plus `offline`.
- **Active card** — `pk-card` (the `popkin-card` variant) in the Popkin's colour with
  `pk-popkin-tile` (emoji), the name, the latest Everyone message as "{first name}: {text}",
  `pk-avatar` stack of up to 3 with "+N", "{n} members", and `pk-time-left` (L2-017 AC1).
  `pk-badge` shows the unread count, "99+" above 99, with an accessible name such as "3 unread
  messages" (L2-017 AC2). The card is an `<a href>` to the Popkin's `AddressUrl`, so choosing it
  opens the Popkin at its address as a full page load (AC3, L2-064 AC9,
  [Open a Popkin by its address](../open-by-address/README.md)).
- **Wrapped-up row** — muted `pk-popkin-tile`, the name, "Wrapped {Mon d} · {n} people · {n}
  photos" and a "Recap" label (L2-018 AC1); choosing it opens `/recap` on the Popkin's address
  (AC2, L2-064 AC9). The
  section is rendered only when the list is not empty (AC3).
- **Empty state** — `pk-empty-state` explains what a Popkin is, with "Start a Popkin" (`/new`)
  and "Scan to join" (opens `ScanToJoinDialog`, `invitations/join-by-code`) (L2-017 AC6).
- **Loading** — skeleton cards the size of real cards, hidden from assistive technology, with
  `aria-busy` on the list and a visually hidden "Loading your Popkins…" (L2-017 AC7, L2-056 AC1,
  L2-055 AC5).
- **`formatTimeLeft(endsAt, now)`** (pure helper, `api` library) — the largest two units ("1 day
  6 hrs left", "42 min left", L2-044 AC5), "Ongoing" for `null`, and "Until {Mon d}" for a far
  end, as the mock shows for "Until Nov 30". The distance at which "Until {date}" replaces the
  count is `<TO SUPPLY>`. `pk-time-left` re-renders at least once a minute.
- **`formatBadge(count)`** (pure helper) — the count, or "99+" above 99.
- **`PopkinsSnapshot`** (`api` library) — keeps the last successful `MyPopkinsView` so the
  offline state can show it (L2-056 AC4). Whether it is a service-worker cache or browser storage
  is `<TO SUPPLY>`; the snapshot is cleared on sign-out.
- **`PopkinsApi.listMyPopkins()`** — `HttpPopkinsApi` behind `POPKINS_API`.

### Backend

- **`PopkinsController.List`** — `GET /api/popkins`; sends `GetMyPopkinsQuery`.
- **`GetMyPopkinsQueryHandler`** — reads the caller from `ICurrentPerson` and projects, in one
  query through `IAppDbContext`, the caller's memberships with `LeftAt` null and their
  `PopkinSpace`s:
  - active cards ordered by `PopkinSpace.LastActivityAt` descending (L2-017);
  - wrapped-up rows ordered by `WrappedUpAt` descending;
  - per card the latest `Message` of the Everyone `ChatThread` and its author's first name, the
    active member count, up to 3 avatars, and the unread count;
  - per wrapped-up row the people count and the `Photo` count.
- **Unread count** — messages in every thread the member can read in that Popkin (Everyone and
  their direct messages) sent after the member's `ThreadReadState.LastReadAt` and not authored
  by them. The same rule feeds the Chat tab count in `popkins/popkin-home`.
- **Avatars** — `AvatarDto` carries initials, an accent from `AvatarAccent.For(personId)` (the
  colour that stays the same for a person, L2-013 AC6) and, for a member with a photo, an
  expiring URL from `IPhotoStore` (L2-051 AC2).
- **DTOs** — `MyPopkinsDto { Active, WrappedUp }`, `ActivePopkinCardDto`,
  `WrappedUpPopkinDto`, `LatestMessageDto`, `AvatarDto`. `ActivePopkinCardDto` and
  `WrappedUpPopkinDto` carry `AddressUrl`, built by `PopkinUrlBuilder` (L2-064 AC9).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-017` | `L1-005` | List my active Popkins: My Popkins lists the Popkins a member belongs to, the most recently active first. |
| `L2-018` | `L1-005` | List my wrapped-up Popkins: Wrapped-up Popkins stay within reach under the active ones. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |
| `L2-064` | `L1-016` | Open a Popkin by its address: The address is the Popkin's front door for its members and a closed door for everyone else. This feature realises AC9. |

## Diagrams

### System context

A member uses Popkin to see every Popkin they belong to; no external system takes part.

![C4 system context for My Popkins](diagrams/c4-context.png)

### Containers

The web app reads one list from the Popkin API, which reads the database; avatar photos come
from the photo store through expiring URLs.

![C4 container view for My Popkins](diagrams/c4-container.png)

### Components

`MyPopkinsPage` loads through `PopkinsApi` and falls back to `PopkinsSnapshot` offline;
`GetMyPopkinsQueryHandler` scopes the query to the caller.

![C4 component view for My Popkins](diagrams/c4-component.png)

### Class structure

`MyPopkinsDto` holds two lists, active cards and wrapped-up rows, each built from domain
entities the handler reads through `IAppDbContext`.

![Class diagram for My Popkins](diagrams/class-structure.png)

### Behaviour — list my Popkins

The page shows skeletons, then cards, the empty state or the error state; offline it shows the
saved list under a banner.

![Sequence diagram for listing my Popkins](diagrams/sequence-list-popkins.png)

### Behaviour — move on from My Popkins

Each choice on the screen leads to one route or dialog: a home, a recap, a new Popkin, the
account or the scanner.

![Sequence diagram for navigating from My Popkins](diagrams/sequence-navigate-from-list.png)
