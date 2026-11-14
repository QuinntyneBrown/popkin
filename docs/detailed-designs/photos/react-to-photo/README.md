# React to a photo

## Overview

Popkin is a free platform for pop-up communities. Members of a Popkin share photos in an album
and open each one in the [photo view](../view-photo/README.md). This feature lets a member react
to a photo with an emoji. A row under the photo offers five quick reactions, ❤️ 😂 😍 🔥 and 👏,
and "More reactions" for any other emoji of the catalogue. Picking a reaction the member already
gave removes it. A member may give one photo several different emoji, each toggled on its own,
as on a chat message (L2-024 AC4).

- **reaction** — one emoji a member gives a photo, stored as a `PhotoReaction`
- **quick reaction** — one of the five toggle buttons in the react bar
- **reaction chip** — label above the react bar that shows one emoji and its count. It is filled
  when the member gave that reaction.
- **catalogue** — the emoji a reaction may be, the same list for a photo and for a chat message
- **optimistic update** — change shown on screen before the server confirms it, undone when the
  server refuses

The screen updates at once on a press and confirms with the server afterwards. When the save
fails, the count returns to what it was and a toast says so (L2-034 AC4). The behaviour mirrors
reactions on chat messages (L2-024). A photo of a direct message takes reactions as an album
photo does, for its two members only (known gap 73, closed by journey 14).

## Description

### Screens and states

- `docs/mocks/pages/photo-view/default.html` — the chips "❤️ 10" (named "Heart, 10, you reacted",
  `aria-pressed="true"`) and "😍 4"; the react bar with ❤️ pressed; "More reactions". The layout
  is one column below 1024 px; from 1024 px the author, caption, chips, comments, react bar and
  comment field sit in a side panel beside the photo (L2-058 AC11). The react bar is in the same
  place in the info at every width: under the caption below 1024 px, at the foot of the panel
  from 1024 px.
- `docs/mocks/pages/photo-view/not-reacted.html` — "❤️ 9" and no quick reaction pressed: the state
  before the member's reaction, the state a removal returns to (L2-034 AC3).
- `docs/mocks/pages/photo-view/reaction-failed.html` — the state a rollback returns to, with the
  danger toast "We couldn’t save your reaction." (chat's words), which stays until dismissed
  (L2-034 AC4, L2-056 AC7).
- `docs/mocks/pages/photo-view/direct.html` — a photo of a direct message, with its chip "😍 1"
  and the same react bar.
- `docs/mocks/pages/photo-view/wrapped.html` — a photo of a wrapped-up Popkin: the chips stay to
  read; there is no react bar (L2-045).
- `docs/mocks/dialogs/reactions/more.html` — the emoji picker part, `pk-emoji-picker`, that "More
  reactions" opens in a CDK dialog. The photo view reuses it; the photo has no sheet of its own.

### API

- `PUT /api/popkins/{popkinId}/photos/{photoId}/reactions/{emoji}` — adds the caller's reaction.
  It is idempotent and returns `200 OK` with the photo's reactions, `[{ emoji, count, mine }]`,
  ordered by when each emoji was first given, as chat orders them.
- `DELETE /api/popkins/{popkinId}/photos/{photoId}/reactions/{emoji}` — removes it. It is
  idempotent and returns `200 OK` with the photo's reactions.
- Errors for both: `404 popkin_not_found` for a non-member (L2-051 AC1), `404 photo_not_found`
  for a photo outside the Popkin or a photo of a direct message the caller is not in,
  `409 popkin_wrapped_up` (L2-045 AC2), `400 emoji_not_allowed` (L2-052 AC1). The emoji is
  URL-encoded in the path.
- `GET /api/popkins/{popkinId}/photos/{photoId}` — the photo read of
  [view a photo](../view-photo/README.md) — gains `reactions` in the same shape,
  `commentCount` and `canDelete`.

### Frontend

- **`PhotoViewPage`** — from [view a photo](../view-photo/README.md). This feature adds
  `toggleReaction(emoji)`, which takes these steps:
  1. Keeps the current list.
  2. Applies `applyReactionToggle` and calls `addReaction` or `removeReaction`.
  3. Replaces the list with the server's answer on success.
  4. On failure, restores the kept list and shows the danger `pk-toast` "We couldn’t save your
     reaction." through `Toaster`. The toast has no action and stays until dismissed
     (L2-056 AC7).

  A second press while a request for the same emoji is in flight waits for that request, so the
  two cannot cross. `openMoreReactions()` opens `pk-emoji-picker` in a CDK dialog and toggles the
  emoji picked; dismissing the dialog returns focus to "More reactions". In a wrapped-up Popkin
  the page renders no react bar.
- **`pk-photo-viewer`** — its `react-bar` is a group labelled "React" of five
  `<button aria-pressed>` named "React heart", "React laughing", "React heart eyes", "React fire"
  and "React clapping", plus "More reactions" (L2-034 AC1). Each `stage-chip` is named "{emoji
  name}, {count}" with ", you reacted" when the member reacted. A pressed chip is filled white, so
  the state is shape and text as well as colour (L2-057 AC5, AC6).
- **`applyReactionToggle`** — pure helper in the `api` library. It adds one to the count and marks
  the reaction as the member's, or takes one away and drops a chip that reaches zero.
- **`PhotosApi`** — gains `addReaction` and `removeReaction`; view model `PhotoReactionView`
  (`emoji`, `name`, `count`, `mine`). The emoji names come from the chat's catalogue,
  `frontend/projects/api/src/lib/api/chat/reactions.ts`.

### Backend

- **`PhotosController`** — gains the `PUT` and `DELETE` reaction actions.
- **`AddPhotoReactionCommand` / `AddPhotoReactionCommandHandler`** and
  **`RemovePhotoReactionCommand` / `RemovePhotoReactionCommandHandler`** — introduced. Each handler
  checks membership through `IMembershipGuard` and loads the `Photo` scoped to the Popkin with
  the read guard of `GET …/photos/{photoId}`, so a photo of a direct message is found only by its
  two members. Each refuses a wrapped-up Popkin, inserts or deletes the caller's `PhotoReaction`,
  saves, and returns the counts grouped by emoji.
- **Catalogue** — the chat's: `ReactionValidator` in `Popkin.Application/Chat` checks the emoji
  of a photo reaction as it checks a message's, and answers `400 emoji_not_allowed` for one
  outside it. No second list exists.
- **Domain** — `PhotoReaction` (`PhotoId`, `MembershipId`, `Emoji`, `ReactedAt`) with the key
  `(PhotoId, MembershipId, Emoji)`, so one member may give several different emoji.
  `IAppDbContext` gains `DbSet<PhotoReaction>`; `PhotoReactionConfiguration` maps it with cascade
  delete from `Photo` (L2-036 AC3).
- **Real time** — none. Other members with the photo open see the new counts on their next read
  of the photo; L2-034 asks for no live update.

### Built in journey 14

- **Backend** — `PhotoReaction` (migration `AddPhotoReactions`) and `ReactToPhoto`, behind
  `PUT` and `DELETE /api/popkins/{popkinId}/photos/{photoId}/reactions/{emoji}`, checked against
  chat's catalogue (`ReactionValidator`). Every action on a photo passes `PhotoAccess`, the one
  read guard of a photo: `404 photo_not_found` to anyone who may not see it, the third member of
  a direct message too; `409 popkin_wrapped_up` in a wrapped-up Popkin. `GetPhoto` answers the
  reactions grouped by emoji with the caller's own marked.
- **`applyReactionToggle`** (`api` library, `photos/photo-reactions.ts`, with unit tests) —
  toggles one emoji of a photo's reactions on the device, as the server will.
- **`PhotoViewStore`** — gives and takes back a reaction at once and puts the count back when
  the server refuses; the page then shows "We couldn’t save your reaction.".
- **`pk-react-bar`** with the five quick reactions and "More reactions", which opens
  `PhotoReactionsDialog` (the catalogue's other emoji in `pk-reaction-grid`); the chips are
  `pk-photo-viewer`'s. A wrapped-up Popkin shows the chips and no react bar.
- A photo of a direct message takes reactions for its two members (known gap 73, closed by journey 14).

### Open questions

Settled by journey 14:

- One photo may take several different emoji from one member, each toggled on its own, as chat
  allows (L2-024 AC4).
- The catalogue is the chat's (`Reactions.cs`, `ReactionValidator`, `reactions.ts`).
- Counts are not pushed to other members; the next read shows them.
- The toast of a failed photo reaction reads "We couldn’t save your reaction.", as chat's, with
  no "Try again": a member presses the reaction again. This is the simplest choice the contract
  left open.
- A photo of a direct message takes reactions as an album photo does (known gap 73).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-034` | `L1-009` | React to a photo: Members react to photos with emoji. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |
| `L2-058` | `L1-014` | Responsive from 360 px: One layout serves every screen size. |

## Diagrams

### System context

A member reacts to a photo of a Popkin they belong to.

![C4 system context for reacting to a photo](diagrams/c4-context.png)

### Containers

The web app saves each reaction through the Popkin API, which writes it to the Popkin database.
No file is touched.

![C4 container view for reacting to a photo](diagrams/c4-container.png)

### Components

`PhotoViewPage` drives the react bar in `pk-photo-viewer`, the emoji picker and the toaster. Two
handlers add and remove reactions, and both check the emoji with the chat's `ReactionValidator`.

![C4 component view for reacting to a photo](diagrams/c4-component.png)

### Class structure

`PhotoReaction` belongs to one `Photo` and one membership. The page applies the toggle with a
pure helper before the server answers.

![Class diagram for reacting to a photo](diagrams/class-structure.png)

### Behaviour — add or remove a reaction on a photo

The press changes the count and the pressed state at once. The server's answer replaces it, or a
failure restores it and shows the toast "We couldn’t save your reaction." (L2-034 AC2, AC3, AC4).

![Sequence diagram for toggling a photo reaction](diagrams/sequence-toggle-reaction.png)

### Behaviour — pick a reaction from More reactions

"More reactions" opens the emoji picker in a dialog. The emoji picked follows the same toggle;
dismissing the dialog returns focus to the control.

![Sequence diagram for more reactions](diagrams/sequence-more-reactions.png)
