# Direct messages

## Overview

A *Popkin* is a private space for one group of *members*. Besides the *Everyone* thread that all
members share, two members of the same Popkin may talk privately in a *direct message*. This feature
covers opening a direct message, what it shows, and the rule that nobody but its two members can
read it.

- **direct message** — chat thread of kind `Direct` between exactly two members of one Popkin
- **participant** — one of the two memberships a direct thread names, `MemberAId` or `MemberBId`
- **ordered pair** — the two membership ids stored lowest first, so one pair of members has one thread per Popkin

A direct message opens from a row on the Chat tab, from the New message dialog (conversations) or
from a member elsewhere in the Popkin. Its header shows the other member's avatar and name and "From
{emoji} {Popkin name}"; the thread starts with "Only you two can see this". Everything a member can
do in Everyone works the same way here: text, photos, reactions and replies. A direct message
belongs to its Popkin: it exists only between members of that Popkin and becomes read-only when the
Popkin wraps up.

## Description

**Screens and states:**

- `docs/mocks/pages/direct-message/default.html` — header with avatar, "Walt Brennan", "From 🏕️ Lakeside Weekend", "Call Walt"; `dm-intro` with "Only you two can see this"; messages, one with a reaction.
- `docs/mocks/pages/direct-message/loading.html` — skeleton bubbles and "Loading messages…".
- `docs/mocks/pages/direct-message/empty.html` — "Say hello to Walt. This is the start of your chat."
- `docs/mocks/pages/direct-message/error.html` — "We couldn't load this chat" with "Try again" and "Back to Chat".
- `docs/mocks/pages/group-chat/read-only.html` — read-only composer line reused for a wrapped-up Popkin (L2-023 AC5); no direct-message mock draws this state, so a `direct-message/read-only` mock is `<TO SUPPLY>`.

**API:**

- `PUT /api/popkins/{popkinId}/threads/direct/{memberId}` — 200 `ThreadDto` when the thread exists, 201 when created; 400 `cannot_message_self`; 404 `popkin_not_found`, `member_not_found`; 409 `popkin_wrapped_up` when no thread exists yet and the Popkin has wrapped up.
- `GET /api/popkins/{popkinId}/threads/{threadId}` — 200 `ThreadDto`; 404 `thread_not_found` for anyone but the two participants.
- Messages, reactions, replies and photos use the endpoints of send-message-to-everyone, react-to-message, reply-to-message and send-photos-in-chat; each returns 404 `thread_not_found` to a non-participant (L2-023 AC2).

**Route.** The mock manifest gives the route `/p/:popkin/chat/:member`, so the page is keyed by the
other member's membership id: `/p/:popkinId/chat/:memberId`. The shared route table lists
`/p/:popkinId/chat/:threadId`; this design follows the mock, as the conventions require, and the
route table should be updated to match. The page resolves the thread with the idempotent `PUT`
above. `PUT` is used because the call may create the thread and is safe to repeat.

**Frontend (Popkin web app):**

- **`DirectMessagePage`** — `pages/direct-message/direct-message.page.ts`, selector `pk-direct-message-page`, route `/p/:popkinId/chat/:memberId`, route data `{ shell: 'app', page: 'direct-message' }`. It composes `pk-top-bar` (Back, `pk-avatar`, name, "From {emoji} {name}", icon button "Call {first name}" that leads to the calls subsystem), the `dm-intro` block of `pk-message`, `pk-message`, `pk-skeleton`, `pk-empty-state` and `pk-composer` with the placeholder "Message {first name}".
- **`ThreadStore`**, **`MessageOutbox`**, **`ReactionsDialog`**, **`AddPhotosDialog`** — the same services and dialogs as the Everyone thread (L2-023 AC3); the page differs only in its header, intro and placeholder.
- **`ChatApi.openDirectThread(popkinId, memberId)`** — returns `ThreadView`, then the store loads the latest 50 messages.
- **Read-only** — when `ThreadView.readOnly` is true the composer is replaced by the wrapped-up line and "Call {first name}" is hidden (L2-023 AC5, L2-045 AC1).

**Backend:**

- **`OpenDirectThreadCommand`** / **`OpenDirectThreadCommandHandler`** — loads the caller's membership (`IMembershipGuard`, 404 `popkin_not_found`) and the target membership in the same Popkin with `LeftAt` null. A target outside the Popkin is refused with 404 `member_not_found`, so two people who share no active Popkin cannot start a direct message (L2-023 AC4). A target equal to the caller is refused with 400 `cannot_message_self`. The handler finds the `Direct` thread with the ordered pair; when none exists it requires an active Popkin and inserts one built by `ChatThread.Direct(popkinId, first, second)`.
- **`ChatThread.CanRead(membershipId)`** — domain rule: true for any member on `Everyone`, and only for `MemberAId` or `MemberBId` on `Direct`. Every chat handler applies it after the membership check and throws `ThreadNotFoundException` when it fails; the controller maps that to 404 `thread_not_found`, so a direct thread's existence is not disclosed (L2-023 AC2, L2-051 AC1).
- **`ChatThreadConfiguration`** — filtered unique index `(PopkinId, MemberAId, MemberBId)` where `Kind = Direct`. Two members opening the thread at the same time race on the insert; the loser catches the unique violation and reloads the winner's row.
- **`ThreadDto`** — `Id`, `Kind`, `Other` (`MemberDto`: membership id, display name, photo address; never a phone number or email, L2-054 AC2), `PopkinEmoji`, `PopkinName`, `Colour`, `ReadOnly`.
- **Delivery** — `SignalRPopkinNotifier` sends direct-thread events with `Clients.Users(personA, personB)` and never to the `popkin:{popkinId}` group (live-messages).
- **Photos** — a photo sent in a direct message is stored with `Photo.DirectThreadId` and stays out of the album (send-photos-in-chat, L2-026 AC3).
- **A participant who leaves** — what a direct message shows after one participant leaves the Popkin (L2-047) is `<TO SUPPLY>`, as is the `code` for a send refused in that case.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-023` | `L1-007` | Direct messages: Two members of one Popkin talk privately. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-054` | `L1-012` | Personal data is protected: Phone numbers, emails, messages and photos are handled as private data. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |

## Diagrams

### System context

Two members of one Popkin exchange messages through Popkin; nobody else is party to the thread.

![C4 system context for direct messages](diagrams/c4-context.png)

### Containers

The web app opens the thread and posts messages to the Popkin API; the API pushes new messages to
the two members only over SignalR and stores the thread in the Popkin database.

![C4 container view for direct messages](diagrams/c4-container.png)

### Components

`DirectMessagePage` shares `ThreadStore` and `ChatApi` with the Everyone thread. In the API,
`ThreadsController` dispatches `OpenDirectThreadCommand`, and every message endpoint checks
`ChatThread.CanRead` before it reads or writes.

![C4 component view for direct messages](diagrams/c4-component.png)

### Class structure

A `ChatThread` of kind `Direct` names two `Membership` rows and belongs to one `PopkinSpace`.
`OpenDirectThreadCommandHandler` finds or creates it and returns `ThreadDto`; the controller maps
`ThreadNotFoundException` to 404.

![Class diagram for direct messages](diagrams/class-structure.png)

### Behaviour — open a direct message

The page resolves the thread with an idempotent `PUT`, which refuses a member outside the Popkin
(L2-023 AC4), then loads the latest messages and shows the header and "Only you two can see this"
(L2-023 AC1), or the read-only line for a wrapped-up Popkin (L2-023 AC5).

![Sequence diagram for opening a direct message](diagrams/sequence-open-direct-message.png)

### Behaviour — privacy of a direct message

A request for a direct thread's messages from any other member returns 404 `thread_not_found`
(L2-023 AC2), and live events for the thread reach only the two participants.

![Sequence diagram for direct message privacy](diagrams/sequence-direct-privacy.png)
