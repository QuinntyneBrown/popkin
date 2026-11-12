# Leave a Popkin

## Overview

A member who is not the Host may leave a Popkin at any time. Leaving ends the membership but
keeps what the member added: their messages and photos stay in the Popkin. To come back, the
person joins again with an invite. The Host has no way to leave; the Host wraps the Popkin up
instead (L2-043).

- **active membership** — `Membership` row whose `LeftAt` is null; the only kind that grants access
- **former member** — person whose membership in a Popkin has a `LeftAt` time

Leaving starts from "Leave this Popkin" in the member's Popkin settings menu
(`popkins/popkin-settings`), which opens a confirmation dialog. After a successful leave, My
Popkins opens without that Popkin, the remaining members see one member fewer, and every later
request the former member makes in that Popkin is answered as if it did not exist.

## Description

### Screens and states

- `docs/mocks/dialogs/leave-popkin/default.html` — "Leave Lakeside Weekend?", "Your messages and
  photos stay. To come back you'll need a new invite.", "Leave" and "Stay".
- `docs/mocks/dialogs/leave-popkin/busy.html` — "Leaving…".
- `docs/mocks/dialogs/popkin-settings/member.html` — the entry point.
- The mocks draw no failure state for this dialog; its presentation is described below and its
  copy is `<TO SUPPLY>`.

### API

- `DELETE /api/popkins/{popkinId}/members/me` — `204 No Content`. Failures: `403`
  `host_cannot_leave`; `404` `popkin_not_found`; `401` without a session.
- Real time: `MemberLeft` to group `popkin:{popkinId}`.

### Frontend (Popkin web app)

- **`LeavePopkinDialog`** (`dialogs/leave-popkin/leave-popkin.dialog.ts`) — CDK dialog in
  `pk-dialog`, opened with the Popkin's name. It names the Popkin and states what stays and how
  to return (L2-047 AC1), with `pk-button` "Leave" (danger) and "Stay". "Leave" sets `busy`,
  reads "Leaving…" and disables both buttons (L2-056 AC3), then calls `PopkinsApi.leave`. On
  `204` it closes and navigates to `/popkins` (L2-047 AC2). On failure it re-enables the buttons
  and shows a danger `pk-toast` through `Toaster`, which stays until dismissed (L2-056 AC7).
  "Stay", Escape or the backdrop close it and return focus to "Popkin settings".
- **`PopkinsApi.leave(popkinId)`** — `HttpPopkinsApi` sends the `DELETE`.
- **My Popkins** — reloads on arrival, so the left Popkin is absent; the snapshot of
  `popkins/my-popkins` is replaced by that load.

### Backend

- **`MembersController.LeaveMe`** — `DELETE /api/popkins/{popkinId}/members/me`; sends
  `LeavePopkinCommand`.
- **`LeavePopkinCommandHandler`** — calls `IMembershipGuard.RequireMember` (`404`
  `popkin_not_found` for a non-member). A Host membership throws `HostCannotLeaveException`,
  mapped to `403` `host_cannot_leave`, so the rule holds even for a hand-made request
  (L2-047 AC3). Otherwise it calls `Membership.Leave(now)` with `TimeProvider`, saves, and calls
  `IPopkinNotifier.MemberLeft` with the new member count.
- **`Membership.Leave(now)`** — sets `LeftAt`. Messages, photos, reactions, ratings and comments
  keep their `…MembershipId` references and stay readable to the remaining members, shown with
  the display name the membership held.
- **`IMembershipGuard`** — treats a membership with `LeftAt` set as absent, so every later
  request from the former member in that Popkin is refused with `404` `popkin_not_found`
  (L2-047 AC4, L2-051 AC1). Joining again through an invite creates a new `Membership`
  (`invitations/join-popkin`).
- **`SignalRPopkinNotifier.MemberLeft`** — sends `MemberLeft` to `popkin:{popkinId}`, so the
  other members' home updates its count (L2-047 AC2), and removes the former member's
  connections from `popkin:{popkinId}` and from the `thread:` and `call:` groups of that Popkin,
  so no further event reaches them.
- Whether leaving during a live group call also ends the person's call participation at once is
  `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-047` | `L1-006` | Leave a Popkin: A member who is not the Host leaves when they want. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |

## Diagrams

### System context

A member leaves the Popkin; the other members see one member fewer.

![C4 system context for leaving a Popkin](diagrams/c4-context.png)

### Containers

The web app sends one request; the Popkin API sets `LeftAt` in the database and pushes
`MemberLeft` to the remaining members.

![C4 container view for leaving a Popkin](diagrams/c4-container.png)

### Components

`LeavePopkinDialog` calls `PopkinsApi`; `LeavePopkinCommandHandler` checks membership and role,
saves and notifies.

![C4 component view for leaving a Popkin](diagrams/c4-component.png)

### Class structure

`Membership.Leave` holds the state change; `HostCannotLeaveException` carries the Host refusal.

![Class diagram for leaving a Popkin](diagrams/class-structure.png)

### Behaviour — leave a Popkin

"Leave" disables the dialog, the API refuses the Host and otherwise ends the membership, and the
person lands on My Popkins.

![Sequence diagram for leaving a Popkin](diagrams/sequence-leave.png)

### Behaviour — request a Popkin after leaving

The membership guard finds no active membership and every request ends in `404`
`popkin_not_found` and the not-found screen.

![Sequence diagram for a request after leaving](diagrams/sequence-request-after-leaving.png)
