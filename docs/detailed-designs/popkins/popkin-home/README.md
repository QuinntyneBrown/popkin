# Popkin home

## Overview

The *Popkin home* is the first screen of one Popkin. It summarises the Popkin at a glance — who
is in it, how long it has left, the latest chat, photos and experiences — and leads to everything
else: chat, photos, experiences, a group call, the invite and, through the "Popkin settings"
menu, the Host's changes.

- **section** — one independently loaded block of the home: Chat, Photos, Experiences or Members
- **tabs** — bottom navigation of a Popkin (`pk-popkin-nav`): Home, Chat, Photos, Experiences
- **Everyone** — chat thread that every member of a Popkin shares
- **experience** — something the group did, a restaurant, or something it wants to do, which members rate

The header and the four sections load separately, so one failing section leaves the others on
screen (L2-019 AC9). Only members see the home; anyone else receives the not-found response
(L2-051 AC1). A wrapped-up Popkin opens on its recap instead (L2-045 AC5).

## Description

### Screens and states

- `docs/mocks/pages/popkin-home/default.html` — header with time left, actions, all sections.
- `docs/mocks/pages/popkin-home/ongoing.html` — no end date, so no time left (L2-019 AC1).
- `docs/mocks/pages/popkin-home/loading.html` — skeletons, "Loading this Popkin…", tabs shown.
- `docs/mocks/pages/popkin-home/empty.html` — "It's just you so far" with "Invite people" and
  "Say hello", "No photos yet" with "Add the first photo", "Nothing shared yet" with "Share one".
- `docs/mocks/pages/popkin-home/partial.html` — "Photos didn't load. The rest of the Popkin is
  fine." with "Try again".
- `docs/mocks/pages/popkin-home/error.html` — "We couldn't open this Popkin" with "Try again"
  and "My Popkins".

### API

- `GET /api/popkins/{popkinId}` — `200` `PopkinHomeDto`; `404` `popkin_not_found`.
- `GET /api/popkins/{popkinId}/threads/everyone/preview` — `200` `ChatPreviewDto`; `404`
  `popkin_not_found`.
- `GET /api/popkins/{popkinId}/photos/summary` — `200` `PhotosSummaryDto`; `404`
  `popkin_not_found`.
- `GET /api/popkins/{popkinId}/experiences/summary` — `200` `ExperiencesSummaryDto`; `404`
  `popkin_not_found`.
- `GET /api/popkins/{popkinId}/members` — `200` `MemberDto[]`, Host first; `404`
  `popkin_not_found`.
- Real time: `PopkinHub` at `/hubs/popkin`, group `popkin:{popkinId}`, events `PopkinChanged`,
  `MemberJoined`, `MemberLeft`, `MessageAdded`.

Every endpoint answers `401` without a session. A wrapped-up Popkin is still readable.

### Frontend (Popkin web app)

- **`PopkinHomePage`** (`pages/popkin-home/popkin-home.page.ts`, route `/p/:popkinId`,
  `data-page="popkin-home"`, `shell: 'app'`, `signedInGuard`) — container that provides
  `PopkinHomeStore` and composes, inside `pk-app-screen` (`layout="tab"`) and `pk-home`:
  - **Header** — `pk-home-header`, the mock's `home-header` block: `pk-popkin-tile`, the name, a
    `pk-avatar-stack` of up to 4 with "+N", "{n} members", and the time left "1 day 6 hrs left ·
    Wraps up Sun, 6 pm" only when `endsAt` is set (L2-019 AC1). A `pk-icon-button` "Popkin
    settings" opens `PopkinSettingsDialog` (`popkins/popkin-settings`).
  - **Actions** — `pk-button` "Group call" in the Popkin's colour (opens `/p/:popkinId/call`,
    L2-029) and `pk-button` "Invite" (opens `InviteDialog`, `invitations/invite-people`)
    (L2-019 AC2).
  - **Chat** — `pk-chat-card`, a link to `/p/:popkinId/chat` with the latest Everyone messages
    (sender, time, one truncated line) and "{n} new" (L2-019 AC3). Its rows are the mock's
    `chat-preview` block. The card holds four messages; a phone shows the three latest and the
    oldest of the four appears from 1024 px.
  - **Photos** — "{n} photos", `pk-photo-strip` with the latest thumbnails, each linking to
    `/p/:popkinId/photos/:photoId`, and "See all" (L2-019 AC4).
  - **Experiences** — "{n} shared", a `pk-experience-row` for each of the highest-rated
    experiences with `pk-rating` "4.8 · 11 ratings", and "See all" (L2-019 AC5).
  - **Members** — "{n}" and `pk-member-list`, the Host first and labelled "Host", the viewer named
    "(you)" (L2-019 AC6).
  - **Tabs** — `pk-popkin-nav` with Home marked `aria-current="page"` and a heavier label and icon,
    and the Chat unread count (L2-019 AC7).
  - Per section (`pk-section`), `pk-empty-state` with its first action (L2-019 AC8),
    `pk-skeleton` while loading, and `pk-alert` with "Try again" on failure (AC9).
- **`PopkinHomeStore`** (`api` library, with unit tests, ADR 0011) — `state` is `loading | ready |
  error | not-found` for the whole screen, and each of chat, photos, experiences and members is a
  `Section<T>`: `loading | ready | empty | error` plus data. The five reads start in parallel.
  `retry()` reads everything again; `retrySection(section)` reads that section alone. A section
  that answers `404` makes the whole screen not-found.
- **Text** — `home-text.ts` in the `api` library writes the time left ("1 day 6 hrs left · Wraps
  up Sun, 6 pm": the weekday within a week, otherwise "19 Sep", with the year when it differs;
  minutes only when not zero), "14 members" and "1 member", "48 photos", "4 shared", "3 new",
  "4.8 · 11 ratings" and "(you)". The store recomputes the time left every 60 s.
- **API contracts** — `PopkinsApi.getHome`, `PopkinsApi.getMembers`, `ChatApi.getEveryonePreview`,
  `PhotosApi.getSummary` (`PHOTOS_API`), `ExperiencesApi.getSummary` (`EXPERIENCES_API`), each
  behind its injection token.
- **`PopkinRealtime` / `POPKIN_REALTIME` / `SignalRPopkinRealtime`** — the store reads the chat
  preview again on a `MessageAdded` in the Everyone thread, and the header and Members again on
  `MemberJoined`. After every connection of the hub, the first included, it reads everything
  again quietly: what is shown stays until the answer arrives, and stays if the read fails. The
  design adds `PopkinChanged`, applied in place (L2-020 AC3, AC4), and `MemberLeft`, which reads
  the header and Members again (L2-047 AC2). The new count on the Chat card and on the Chat tab
  comes from `UnreadTracker` ([Live messages](../../chat/live-messages/README.md), L2-027 AC3).
- **Form factors (L2-058)** — below 768 px the header carries a bar that leads to My Popkins.
  From 768 px the rail's "Your Popkins" replaces the bar and the actions sit in the header. From
  1024 px the sidebar shows the name, the members and the time left, and the home is two columns:
  Chat and Photos, then Experiences and Members. The page always passes up to 4 chat lines,
  8 photos, 3 experiences and 6 members, and the stylesheets show fewer on a narrower screen: 3
  chat lines below 1024 px, 1 experience below 768 px, 4 members below 1024 px. Nothing reads
  the viewport.

### Backend

- **`IMembershipGuard.RequireMemberAsync(popkinId)`** — every query below starts with it. It loads
  the caller's `Membership` with `LeftAt` null or throws `PopkinNotFoundException`, mapped to
  `404` with `code` `popkin_not_found`, so a non-member cannot tell whether the Popkin exists
  (L2-051 AC1).
- **`GetPopkinHomeQueryHandler`** (`PopkinsController`) — `PopkinHomeDto`: `Id`, `Name`, `Emoji`,
  `Colour`, `Status` (`Active` or `WrappedUp`), `EndsAt`, `MemberCount`, up to 4 `Avatars` (Host
  first, then by join time), `ViewerRole` (`Host` or `Member`), `Viewer` (`MembershipId`,
  `FirstName`) and `UnreadCount`. `UnreadCount` is the unread count of the Everyone thread, by
  the rule `ThreadDto` uses (`ThreadUnread.OfAsync`), and since journey 11 that of the viewer's
  direct messages of the Popkin with it (`DirectThreads.Of`, L2-022 AC3). The web app does not
  show that sum: `PopkinHomeStore` seeds `UnreadTracker` with the Everyone preview's `NewCount`
  and reads `UnreadCount` only until the preview arrives, so the Chat tab's count on the home
  leaves out the direct messages the tracker has not been told of (known gap 67). The Chat card
  still opens the Everyone thread.
- **`GetEveryonePreviewQueryHandler`** (`ThreadsController`) — `ChatPreviewDto`: `ThreadId`, the
  four latest messages that members wrote, oldest first (`Id`, `Author` with `MembershipId`,
  `FirstName` and `Avatar`, `Text`, `SentAt`), and `NewCount`. System notes and deleted messages
  are left out of the messages. `NewCount` is the thread's unread count, which counts the
  "popped in" notes of others too, so it can be above 0 with no message to show.
- **`GetPhotosSummaryQueryHandler`** (`PhotosController`) — `PhotosSummaryDto`: `Count` and the
  latest `Photos` (`Id`, `ThumbnailUrl`, `Caption` or null), each with an expiring thumbnail URL
  from `IPhotoStore` no larger than twice its shown size (L2-055 AC4, L2-051 AC2). URL lifetime
  is `<TO SUPPLY>`; it belongs to journey 5.
- **`GetExperiencesSummaryQueryHandler`** (`ExperiencesController`) — `ExperiencesSummaryDto`:
  `Count` and `Top` (`Id`, `Name`, `PhotoUrl` or null, `Average`, `RatingCount`), at most three,
  highest average first; of two with one average, the one more members rated, then the newer.
  An experience nobody has rated, or that the group wants to do, is not named.
- **`GetMembersQueryHandler`** (`MembersController`) — `MemberDto`: `MembershipId`,
  `DisplayName`, `Avatar`, `Role`, `IsViewer`; active members, Host first, then by `JoinedAt`;
  never a phone number or email (L2-054 AC2).
- **`PopkinHub`** — accepts a connection only with a valid session (L2-050 AC4) and adds it to
  `popkin:{popkinId}` only for members.

### Built in steps

Journey 4, Popkin home, built this design: the five reads, the screen in its states for the five
form factors, the live Chat card and Members, and the invite dialog
([Invite people](../../invitations/invite-people/README.md)). What waits, and for which journey:

- photos and experiences themselves were built in journeys 5, Share photos, and 8, Rate an
  experience, and the two summaries now answer what the Popkin holds
  ([List experiences](../../experiences/list-experiences/README.md)). "Add the first photo" and
  "Share one" link to `/p/:popkinId/photos` and `/p/:popkinId/experiences`, where their dialogs
  are;
- "Popkin settings" was built in journey 9, Wrap up: the button in the header opens the menu,
  with "Invite people" and, for the Host, "Wrap up"
  ([Popkin settings](../popkin-settings/README.md));
- the recap in place of the home of a wrapped-up Popkin (L2-045 AC5) was built in journey 9:
  `PopkinHomeStore` reads the Popkin, and for a wrapped-up one the page opens
  `/p/:popkinId/recap` ([Read-only Popkin](../../wrap-up/read-only-popkin/README.md)). The
  header's read gained `wrappedUpAt`, `keepPhotos`, `photosRemoveAt` and `photosRemovedAt`;
- the banner of the last hour was built in journey 9, with the Host's "Change", and the home
  moves to the recap when its Popkin wraps up while it is open
  ([Time is up](../../wrap-up/time-is-up/README.md));
- `PopkinChanged` and `MemberLeft`: journeys 16 and 18. No handler sends them yet;
- the call was built in journey 7, Group call: "Group call" opens the call screen at
  `/p/:popkinId/call`, and the home shows the banner of a call under way, read by
  `CallBannerStore` ([Group call](../../calls/group-call/README.md));
- My Popkins: journey 6, Come back. The bar and the rail link to `/popkins`;
- the 300 ms wait before a skeleton shows
  ([Loading, failure and offline](../../reliability/loading-failure-offline/README.md)): the
  skeleton shows at once.

The mocks were corrected with the build: in `popkin-home/default.html`, `partial.html` and
`ongoing.html` the Chat card's row that only wide screens show is now the oldest, so a phone
shows the three latest messages (L2-019 AC3), and `components.css` gives the loading header's
button skeletons a width from 768 px.

The `components` library gained `pk-home-header`, `pk-home` (the layout and its loading
skeleton), `pk-section`, `pk-card`, `pk-chat-card`, `pk-rating`, `pk-experience-row`,
`pk-photo-strip` and `pk-member-list`, each with its parity spec (ADR 0008); `pk-app-screen`,
`pk-empty-state`, `pk-skeleton`, `pk-alert`, `pk-badge`, `pk-avatar-stack`, `pk-icon-button` and
`pk-top-bar` were extended. The design system gained
`docs/design-system/components/home-header.html`.

Tests: `PopkinHomeTests` and `HomeSummariesTests` in `Popkin.Api.Tests/Popkins/`,
`EveryonePreviewTests` in `Chat/` and `MembersTests` in `Members/`; unit tests of
`PopkinHomeStore` and `home-text` in the `api` library (ADR 0011);
`e2e/tests/popkin-home.spec.ts` and `e2e/tests/invite-dialog.spec.ts`, with the home's requests
answered by `e2e/fixtures/home.ts` (ADR 0005).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-019` | `L1-006` | Popkin home: The home of a Popkin summarises it and leads to everything in it. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

## Diagrams

### System context

Members and the Host see the Popkin at a glance in Popkin; the Host also reaches the settings.

![C4 system context for the Popkin home](diagrams/c4-context.png)

### Containers

The web app reads the header and four sections from the Popkin API and receives changes over
the SignalR connection; thumbnails come from the photo store.

![C4 container view for the Popkin home](diagrams/c4-container.png)

### Components

`PopkinHomePage`, through `PopkinHomeStore`, calls one API per section and subscribes to
`PopkinRealtime`; every handler starts with `IMembershipGuard`.

![C4 component view for the Popkin home](diagrams/c4-component.png)

### Class structure

One query and one DTO per section; `PopkinHomeStore` holds a `Section` for each so they load and
fail independently.

![Class diagram for the Popkin home](diagrams/class-structure.png)

### Behaviour — open the Popkin home

The header request decides the screen: not-found for a non-member, the recap for a wrapped-up
Popkin, the error state on failure, and otherwise the header, actions and tabs.

![Sequence diagram for opening the Popkin home](diagrams/sequence-open-home.png)

### Behaviour — load the home sections

The four sections load in parallel; each shows its data, its empty state or its own failure
with "Try again" (L2-019 AC8, AC9).

![Sequence diagram for loading the home sections](diagrams/sequence-load-sections.png)

### Behaviour — keep the home current

Events pushed to the Popkin's group update the home without a reload, and the time left is
redrawn at least once a minute.

![Sequence diagram for live updates on the home](diagrams/sequence-live-updates.png)
