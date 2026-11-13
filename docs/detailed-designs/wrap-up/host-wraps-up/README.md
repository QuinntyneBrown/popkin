# The Host wraps up

## Overview

A Popkin is a private space for one group, with a name, an emoji, a colour, members and a length.
Every Popkin ends. It ends either by itself, when its end date arrives (see
[Time is up](../time-is-up/README.md)), or on purpose, when its Host wraps it up. This feature
covers the second path.

**Host** — member who started a Popkin and the only member allowed to change or end it

**wrap up** — act of ending a Popkin, after which it is read-only and has a recap

**keep the photo album** — Host's choice, made at wrap-up, of whether the Popkin's photos stay
after it ends or are removed 30 days later

The Host opens "Wrap up" from the Popkin settings menu on the Popkin home (L2-020 AC1). A
full-screen page asks "Wrap up {name}?", states how many members the decision affects and
explains what follows: everyone gets a recap and the chat goes quiet. One switch decides whether
the photo album is kept. "Wrap it up" ends the Popkin and opens the recap; "Not yet" and "Back"
return to the Popkin home and change nothing.

Wrapping up is a state change on the Popkin, not a deletion. Messages, photos, experiences and
members stay; only new contributions stop (see [Read-only Popkin](../read-only-popkin/README.md))
and the [Recap](../recap/README.md) becomes the Popkin's front page. A member who is not the Host
cannot wrap up a Popkin; the API refuses the request with `403`.

## Description

The slice runs from the wrap-up page in the Popkin web app to the `PopkinSpace` row in the Popkin
database, and ends with a real-time event to every member who has the Popkin open.

### Screens and states

- `docs/mocks/pages/wrap-up/default.html` — the question, the member count, two facts ("Everyone
  gets a recap", "Chat goes quiet"), the "Keep the photo album" switch on with the line "Members
  can keep browsing and saving", "Wrap it up" and "Not yet" (L2-043 AC1, AC2).
- `docs/mocks/pages/wrap-up/album-off.html` — the switch off, the line reads "Photos are removed
  after 30 days" (L2-043 AC2).
- `docs/mocks/pages/wrap-up/submitting.html` — "Wrap it up" disabled and reading "Wrapping up…"
  (L2-043 AC3).
- `docs/mocks/pages/wrap-up/error.html` — danger alert "We couldn't wrap it up." with "Lakeside
  Weekend is still open and nothing has changed. Try again in a moment." and "Wrap it up" enabled
  again (L2-043 AC5).
- `docs/mocks/pages/wrapped-up/host.html` — the recap the Host lands on after success (L2-043 AC3).
- `docs/mocks/dialogs/popkin-settings/default.html` — the Host's settings menu with "Wrap up", the
  entry point (owned by [Popkin settings](../../popkins/popkin-settings/README.md)).

The mock manifest marks the page's loading and empty states as not applicable: the page shows
data the Popkin home has already loaded.

### API

- `POST /api/popkins/{popkinId}/wrap-up` with body `{ "keepPhotos": true | false }` — `200 OK`
  with `WrapUpResultDto`.
  - `400` `validation_failed` — `keepPhotos` missing or not a boolean (L2-052 AC1).
  - `403` `host_only` — the caller is a member but not the Host (L2-043 AC6, L2-051 AC4).
  - `404` `popkin_not_found` — the caller is not a member, or the Popkin does not exist (L2-051
    AC1).
  - `409` `popkin_wrapped_up` — the Popkin is already wrapped up (L2-045 AC2).

### Frontend — Popkin web app

- **`WrapUpPage`** (`frontend/projects/popkin/src/app/pages/wrap-up/wrap-up.page.ts` and
  `wrap-up.page.html`, selector `pk-wrap-up-page`, OnPush) — introduced. Route
  `/p/:popkinId/wrap-up` with data `{ shell: 'bare', page: 'wrap-up' }`, behind `signedInGuard` and
  `memberGuard`. It reads the Popkin's name, emoji, colour and member count from
  `CurrentPopkinStore`, the per-Popkin state the Popkin home loads
  ([Popkin home](../../popkins/popkin-home/README.md)), so it sends no request before it shows. It
  holds three signals: `keepPhotos` (initially `true`), `busy` and `failed`. A member who is not
  the Host and opens the address directly is sent to the Popkin home; the API still refuses a
  forged request (L2-043 AC6).
- **Composition** — the page is a container. It composes `pk-top-bar` (a Back icon button),
  `pk-popkin-tile` (large), two `pk-list-row` facts, `pk-switch` in its setting-row form,
  `pk-alert` (danger, shown when `failed` is true), and two `pk-button`s: primary "Wrap it up"
  (busy label "Wrapping up…") and quiet "Not yet". The switch's consequence line is bound to
  `keepPhotos`, so the state is written as text, not carried by colour alone.
- **`PopkinsApi`** / **`POPKINS_API`** / **`HttpPopkinsApi`** (`frontend/projects/api/src/lib/api/`)
  — introduced method `wrapUp(popkinId: string, keepPhotos: boolean): Observable<WrapUpResult>`.
  The page injects `POPKINS_API`, never `HttpPopkinsApi`.
- **`WrapUpResult`** (`frontend/projects/api/src/lib/models/`) — view model `{ popkinId,
  wrappedUpAt }`.
- **Behaviour** — "Wrap it up" sets `busy`, disables the button and calls `wrapUp` (L2-043 AC3).
  On success the page navigates to `/p/:popkinId/recap` with `replaceUrl`, so Back does not
  return to a wrap-up page for an ended Popkin. On failure it clears `busy`, sets `failed` and
  moves focus to the alert (L2-043 AC5). A `409 popkin_wrapped_up` is treated as success: the
  Popkin has already ended, for example because its time ran out a moment earlier, and the recap
  opens. "Not yet" and Back navigate to `/p/:popkinId` and send nothing (L2-043 AC4).

### Backend — Popkin API

- **`PopkinsController`** (`backend/src/Popkin.Api/Controllers/PopkinsController.cs`) —
  introduced action `WrapUp(Guid popkinId, WrapUpPopkinRequest body)` on
  `POST /api/popkins/{popkinId}/wrap-up`. It requires an authenticated caller through the existing
  fallback policy, sends `WrapUpPopkinCommand` through MediatR and returns `200` with the
  `WrapUpResultDto`. It holds no business rule.
- **`ProblemDetailsExceptionHandler`** — introduced by
  [Membership authorisation](../../security/membership-authorisation/README.md); maps
  `HostOnlyException`, `PopkinNotFoundException` and `PopkinWrappedUpException` to ProblemDetails
  with `code`.

### Backend — Popkin Application and Domain

- **`WrapUpPopkinCommand`** — `PopkinId: Guid`, `KeepPhotos: bool`; returns `WrapUpResultDto`.
- **`WrapUpPopkinCommandValidator`** — `PopkinId` is not empty; `KeepPhotos` is present.
- **`WrapUpPopkinCommandHandler`** — calls `IMembershipGuard.RequireHostAsync(popkinId)`, which
  answers `404` for a non-member and `403` for a member who is not the Host, then hands the
  Popkin to `PopkinWrapUpService` and saves in one unit of work. After the commit it calls
  `IPopkinNotifier.PopkinWrappedUpAsync(popkinId)`.
- **`PopkinWrapUpService`** — introduced; shared by this handler and by
  `WrapUpDuePopkinsCommandHandler` ([Time is up](../time-is-up/README.md)). It calls
  `PopkinSpace.WrapUp(now, keepPhotos)` with `TimeProvider.GetUtcNow()` and ends every open `Call`
  of the Popkin by setting `EndedAt`, so no call outlives the Popkin (L2-045 AC1).
- **`PopkinSpace`** (entity) — gains `WrapUp(DateTimeOffset at, bool keepPhotos)`. The method
  throws `PopkinWrappedUpException` when `Status` is already `WrappedUp`; otherwise it sets
  `Status = PopkinStatus.WrappedUp`, `WrappedUpAt = at` and `KeepPhotos = keepPhotos`. The entity
  also exposes `PhotosRemoveAt`, which is `WrappedUpAt + 30 days` when `KeepPhotos` is false and
  `null` otherwise (L2-043 AC2, L2-045 AC4). `PopkinSpace` carries a concurrency token so that a
  Host request and the worker cannot both wrap up one Popkin; a lost race surfaces as
  `PopkinWrappedUpException`.
- **`WrapUpResultDto`** — `PopkinId`, `WrappedUpAt`.

### Backend — Popkin Infrastructure

- **`PopkinSpaceConfiguration`** — maps `Status`, `WrappedUpAt`, `KeepPhotos` and the concurrency
  token (`rowversion` on SQL Server). The index on `(Status, EndsAt)` that the worker reads is
  declared here as well.
- **`SignalRPopkinNotifier`** (in `Popkin.Api`) — sends `PopkinWrappedUp { popkinId }` to the
  group `popkin:{popkinId}`. Every member with the Popkin open moves to the recap without a reload
  (L2-044 AC4).

### Open points

- The copy of the system message, if any, that the Everyone thread shows when a Popkin wraps up:
  `<TO SUPPLY>`. The mocks show none.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-043` | `L1-011` | The Host wraps up a Popkin: The Host ends a Popkin on purpose, knowing what follows. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

`L2-051` is listed because the endpoint enforces its AC1 (`404` for a non-member) and AC4 (`403`
for a member who is not the Host).

## Diagrams

### System context

The Host ends a Popkin through Popkin; every member of the Popkin sees the result. No external
system takes part.

![C4 system context for the Host wrapping up a Popkin](diagrams/c4-context.png)

### Containers

The web app sends the wrap-up request to the Popkin API, which writes the Popkin database and
pushes the change to members' web apps over the `PopkinHub` connection.

![C4 container view for the Host wrapping up a Popkin](diagrams/c4-container.png)

### Components

Inside the Popkin API, `PopkinsController` sends `WrapUpPopkinCommand`; the handler checks the
caller is the Host through `IMembershipGuard`, applies the wrap-up through `PopkinWrapUpService`
and `PopkinSpace`, and notifies members through `IPopkinNotifier`.

![C4 component view for the Host wrapping up a Popkin](diagrams/c4-component.png)

### Class structure

`WrapUpPopkinCommandHandler` depends on the guard, the shared `PopkinWrapUpService` and the
notifier. `PopkinSpace` owns the state transition and the photo-removal date; `Call` is ended by
the service.

![Class diagram for the Host wrapping up a Popkin](diagrams/class-structure.png)

### Behaviour — the Host wraps up a Popkin

The page disables "Wrap it up" while the request is in flight (L2-043 AC3). The handler refuses a
member who is not the Host with `403` (L2-043 AC6), applies the transition in one unit of work,
then notifies members. A failure leaves the Popkin active and re-enables the button (L2-043 AC5).

![Sequence diagram for the Host wrapping up a Popkin](diagrams/sequence-wrap-up.png)

### Behaviour — the Host says "Not yet"

"Not yet" and Back send nothing and return to the Popkin home (L2-043 AC4).

![Sequence diagram for the Host leaving the wrap-up page without wrapping up](diagrams/sequence-not-yet.png)
