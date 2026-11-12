# Conversations

## Overview

A *Popkin* is a private space for one group; its *members* talk in two kinds of chat thread. The
*Everyone* thread is shared by all members; a *direct message* is a thread between two members of
the same Popkin. This feature is the Chat tab of a Popkin: the screen that lists the member's
threads in that Popkin and starts new direct messages.

- **Chat tab** — the Popkin's screen at `/p/:popkinId/chat`, reached from the Popkin navigation
- **unread count** — number of messages by other members in a thread after the member's last read point
- **last read point** — the newest message of a thread that the member has had in view, stored as `ThreadReadState`
- **New message** — dialog that lists the Popkin's other members and opens a direct message with the one chosen

The Everyone card comes first, larger than the rest and tinted in the Popkin's colour, with the
latest message, its time and the unread count. Direct messages follow under "Direct messages", the
most recent first, each with the other member's avatar and name, the latest message (prefixed "You:"
when the member sent it), its time and an unread mark. A member with no direct messages sees a short
explanation and a "New message" action. Unread counts change live as messages arrive (live-messages).

## Description

**Screens and states:**

- `docs/mocks/pages/conversations/default.html` — Everyone card with "3 unread messages" badge; four direct-message rows, one unread with bold name and the dot "Unread".
- `docs/mocks/pages/conversations/loading.html` — card and row skeletons, status "Loading your chats…".
- `docs/mocks/pages/conversations/empty.html` — "No direct messages yet", "A direct message is between you and one other member. Nobody else can see it." and "New message" (L2-022 AC5).
- `docs/mocks/pages/conversations/error.html` — "We couldn't load your chats" with "Try again"; the Popkin navigation stays (L2-056 AC2).
- `docs/mocks/dialogs/new-message/default.html` — "New message" dialog with "Search members" and member rows.
- `docs/mocks/dialogs/new-message/no-results.html` — "Nobody by that name" and "Only members of Lakeside Weekend can be messaged here."

**API:**

- `GET /api/popkins/{popkinId}/threads` — 200 `ThreadListDto`; 404 `popkin_not_found`.
- `GET /api/popkins/{popkinId}/members` — 200 `MemberDto[]`; 404 `popkin_not_found`. The endpoint belongs to `MembersController` and is shared with the Popkin home designs; this slice uses it unchanged.

**Frontend (Popkin web app):**

- **`ConversationsPage`** — `pages/conversations/conversations.page.ts`, selector `pk-conversations-page`, route `/p/:popkinId/chat`, route data `{ shell: 'app', page: 'conversations' }`. It composes `pk-top-bar` (title "Chat", icon button "New message"), `pk-card` for Everyone with `pk-popkin-tile` and `pk-badge`, `pk-list-row` per direct message with `pk-avatar` and the `pk-badge` unread dot, `pk-empty-state`, `pk-skeleton` and `pk-popkin-nav`.
- **Unread presentation** — an unread row shows a bold name and latest line plus a dot with the accessible name "Unread" (L2-022 AC3), so colour is never the only carrier (L2-057 AC5). The Everyone badge reads "{n} unread messages".
- **`NewMessageDialog`** — `dialogs/new-message/new-message.dialog.ts`, opened with CDK `Dialog`, composed of `pk-dialog`, `pk-text-field` (pill search, label "Search members") and `pk-list-row`. It loads members through `PopkinsApi.getMembers`, removes the caller (L2-022 AC4) and filters by display name as the member types; matching ignores case and accents. Choosing a member closes the dialog with that member's membership id, and the page navigates to `/p/:popkinId/chat/:memberId` (direct-messages). No mock draws a failed member load; that state is `<TO SUPPLY>`.
- **`UnreadTracker`** — root service in the `api` library (live-messages). The page seeds it with the counts from `ThreadListDto` and re-renders when a `MessageAdded` or `ThreadRead` event changes a count or moves a direct message to the top.
- **`ChatApi.listThreads`**, **`PopkinsApi.getMembers`** — methods on the `CHAT_API` and `POPKINS_API` contracts; view models `ConversationsView`, `ThreadSummaryView`, `MemberView`.
- **Times** — the row time reads the clock time for today, the weekday within the past week and a short date beyond, matching "9:41" and "Fri" in the mock; the exact cut-overs are `<TO SUPPLY>`.

**Backend:**

- **`ThreadsController.List`** — sends `GetThreadsQuery(PopkinId)`.
- **`GetThreadsQueryHandler`** — checks membership with `IMembershipGuard` (404 for non-members, L2-051 AC1). It reads the Everyone thread and every `Direct` thread in which the caller is `MemberAId` or `MemberBId` and that holds at least one message; a direct thread opened but never used stays hidden. For each thread it projects the latest non-deleted message, whether the caller sent it, and the unread count: messages by other members with `SentAt` after the caller's `ThreadReadState.LastReadAt`, or all such messages when no read state exists. Direct threads are ordered by latest message time, newest first (L2-022 AC2).
- **`ThreadListDto`** / **`ThreadSummaryDto`** — `Everyone` plus `Direct[]`; each summary carries `ThreadId`, `Other` (`MemberDto` with display name and photo address only, L2-054 AC2), `LatestText`, `LatestIsMine`, `LatestAuthorFirstName`, `LatestAt` and `UnreadCount`.
- **`ThreadReadStateConfiguration`** — key `(ThreadId, MembershipId)`; `IAppDbContext` gains `DbSet<ThreadReadState>`.
- **Query cost** — the list is one query with grouped sub-queries over the index `(ThreadId, SentAt, Id)`, inside the read budget of L2-055 AC3 (95% within 300 ms). A denormalised latest-message column is not introduced; whether one is needed at scale is `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-022` | `L1-007` | Conversations: The Chat tab lists the member's threads in one Popkin. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-056` | `L1-013` | Loading, failure and offline are always explained: A person is never left guessing. |

## Diagrams

### System context

A member lists threads and starts direct messages through Popkin; no external system takes part.

![C4 system context for conversations](diagrams/c4-context.png)

### Containers

The web app reads the thread list and the member list from the Popkin API, which reads the Popkin
database; live events over SignalR keep unread counts current.

![C4 container view for conversations](diagrams/c4-container.png)

### Components

`ConversationsPage` loads threads through `ChatApi`, opens `NewMessageDialog`, which loads members
through `PopkinsApi`, and follows `UnreadTracker`. In the API, `ThreadsController` dispatches
`GetThreadsQuery` and `MembersController` serves the members.

![C4 component view for conversations](diagrams/c4-component.png)

### Class structure

`GetThreadsQueryHandler` reads `ChatThread`, `Message` and `ThreadReadState` and returns a
`ThreadListDto` composed of `ThreadSummaryDto` rows. The page depends on the `ChatApi` contract and
`UnreadTracker`, and opens `NewMessageDialog`, which depends on `PopkinsApi`.

![Class diagram for conversations](diagrams/class-structure.png)

### Behaviour — open the Chat tab

The page shows skeletons, loads the thread list and renders Everyone first, then direct messages or
the empty section. A failed load keeps the navigation and offers "Try again". Live events then raise
counts for threads that are not open.

![Sequence diagram for opening the Chat tab](diagrams/sequence-open-conversations.png)

### Behaviour — start a direct message

"New message" opens the dialog, which lists the Popkin's other members and filters them as the
member types; choosing one navigates to the direct message, and no match shows "Nobody by that name".

![Sequence diagram for starting a direct message from New message](diagrams/sequence-new-message.png)
