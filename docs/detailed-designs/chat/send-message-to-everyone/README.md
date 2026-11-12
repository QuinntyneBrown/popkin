# Send a message to everyone

## Overview

Popkin is a free platform for pop-up communities: a group spins up a private space, invites people
by QR code, then chats, calls, shares photos and rates experiences together. Each such space is a
*Popkin*, and the people in it are its *members*. This feature belongs to the chat subsystem and
covers the one conversation every Popkin has from the moment it exists.

- **Everyone** — chat thread that every member of a Popkin shares
- **thread** — ordered list of messages between a fixed audience, either Everyone or a direct message
- **message** — text, a photo or both, posted by one member to one thread at a server-assigned time
- **system note** — message of kind `System` that Popkin writes into Everyone, such as "Joel popped in. Say hi! 👋"
- **composer** — message bar at the foot of a thread: Add, the message field with Emoji and Photo, and Send
- **here now** — count of members who have Popkin open at this moment

The requirements call the Everyone thread "the heart of a Popkin". A member opens it from the Chat
tab, reads the group's messages oldest first with the latest in view, and posts to the whole group.
The thread's own messages appear on the right in the Popkin's colour; other members' messages carry
an avatar and a first name, shown once for a run of consecutive messages. A divider names each day.
An empty thread invites the first message with three suggested openers.

This slice establishes the thread view, the composer and the send path that the other chat
features extend: reactions (react-to-message), replies (reply-to-message), photos
(send-photos-in-chat), live delivery (live-messages) and failure handling (failed-messages). Direct
messages (direct-messages) reuse the same view with a two-person audience.

## Description

The slice runs from the group chat page to the database. Everything below is introduced by this
design except where marked existing.

**Screens and states** (the mocks are the source of truth for the UI):

- `docs/mocks/pages/group-chat/default.html` — thread with day divider, system note, grouped messages, own message with time, reply bar.
- `docs/mocks/pages/group-chat/loading.html` — skeleton bubbles hidden from assistive technology and the status "Loading messages…".
- `docs/mocks/pages/group-chat/empty.html` — "It's quiet in here. For now.", three opener chips ("👋 Hey everyone!", "So glad you're here", "Who's coming?") and the sub-title "Just you so far".
- `docs/mocks/pages/group-chat/error.html` — "We couldn't load the chat" with "Try again" and "Back to Chat".
- `docs/mocks/pages/group-chat/read-only.html` — wrapped-up Popkin: composer replaced by "This Popkin has wrapped up. Messages stay, but nobody can post new ones." (L2-045 AC1).
- `docs/mocks/notifications/toast/warning.html` — "Slow down a little" with when to try again (L2-053 AC2, AC4).

**API:**

- `GET /api/popkins/{popkinId}/threads/everyone` — 200 `ThreadDto`; 404 `popkin_not_found`.
- `GET /api/popkins/{popkinId}/threads/{threadId}/messages?before=&after=&around=&limit=50` — 200 `MessagePageDto`; 404 `popkin_not_found`, `thread_not_found`.
- `POST /api/popkins/{popkinId}/threads/{threadId}/messages` — 201 `MessageDto` when created, 200 with the stored `MessageDto` when the `clientMessageId` was already used by the caller; 400 `message_empty`, `message_too_long`; 404 `popkin_not_found`, `thread_not_found`; 409 `popkin_wrapped_up`; 429 `rate_limited` with `Retry-After`.

**Frontend (Popkin web app):**

- **`GroupChatPage`** — page at `frontend/projects/popkin/src/app/pages/group-chat/group-chat.page.ts`, selector `pk-group-chat-page`, route `/p/:popkinId/chat/everyone` with route data `{ shell: 'app', page: 'group-chat' }`. It composes `pk-top-bar` (Back, `pk-popkin-tile` emoji, name, "{n} members · {m} here now", "Start group call"), `pk-message` per message, day dividers and system notes from the same component, `pk-empty-state` with `pk-chip` openers, `pk-skeleton` and `pk-composer`. It holds no styles of its own (ADR 0007).
- **`pk-composer`** — existing design-system component (`docs/design-system/components/composer.html`) built in the `components` library. Enter sends and Shift+Enter adds a line (L2-021 AC5). Send is disabled while the field holds only white space (AC6). The field accepts at most 2,000 characters and shows a count at the limit (AC7); the point at which the count first appears is `<TO SUPPLY>`, and no mock draws the count.
- **`pk-message`** — bubble component. Other members' messages carry avatar and first name once per run (L2-021 AC2); own messages sit on the right in the Popkin colour with the time and a visually hidden "You" (AC3). The rule that ends a run (a gap in minutes, a day divider or a system note) is `<TO SUPPLY>`.
- **Day dividers** — labels "Today", "Yesterday", then the weekday or date (L2-021 AC4), computed in the device's time zone. The cut-over from weekday to date is `<TO SUPPLY>`. The mocks disagree: `group-chat/default` labels the mock's today "Saturday" while `direct-message/default` uses "Today"; the mock needs correcting to match L2-021 AC4.
- **`ThreadStore`** — signal-based service in the `api` library, provided per thread page. It loads the thread header and the latest 50 messages, merges live events (live-messages) and pending entries from `MessageOutbox` (failed-messages), and exposes `items`, `state` (`loading` | `ready` | `empty` | `error`) and `readOnly`.
- **`ChatApi` / `CHAT_API` / `HttpChatApi`** — contract, injection token and HTTP implementation in the `api` library; the page injects the token only. View models `ThreadView`, `MessageView`, `MessagePageView` live in `lib/models/`.
- **Openers** — choosing an opener chip puts its text in the message field and moves focus there (L2-021 AC8); it does not send.
- **Text encoding** — message text is rendered with Angular interpolation only, never `innerHTML`, so markup shows as text (L2-052 AC2). Line breaks are preserved by CSS `white-space: pre-wrap` in `pk-message`.

**Backend (Popkin API, Application, Domain, Infrastructure):**

- **`ThreadsController`** — `GET /api/popkins/{popkinId}/threads/everyone` sends `GetEveryoneThreadQuery`. The handler returns `ThreadDto` with the Popkin's emoji, name and colour, the member count, the here-now count from `PresenceTracker` (live-messages) and `ReadOnly` when the Popkin is wrapped up.
- **`MessagesController`** — `GET` sends `GetMessagesQuery` (cursor paging by `SentAt`, then `Id`); `POST` sends `SendMessageCommand`. The `POST` action carries the ASP.NET Core rate limiter policy `messages`: 60 messages per member per minute, partitioned by `PersonId` (L2-053 AC2).
- **`SendMessageCommand`** — `PopkinId`, `ThreadId`, `ClientMessageId`, `Text?`, `PhotoId?`, `ReplyToMessageId?`.
- **`SendMessageCommandValidator`** — validator (library `<TO SUPPLY>`): `ClientMessageId` not empty; text or photo present; text at most 2,000 characters after trimming. Failures return 400 ProblemDetails naming the field with `code` `message_empty` or `message_too_long` (L2-052 AC1).
- **`SendMessageCommandHandler`** — loads the caller's membership through `IMembershipGuard` (404 `popkin_not_found` for a non-member, L2-051 AC1), loads the `ChatThread` and checks `ChatThread.CanRead`, calls `PopkinSpace.EnsureActive()` (409 `popkin_wrapped_up`, L2-045 AC2), then creates the `Message` with `SentAt` from `TimeProvider`. A repeated `ClientMessageId` from the same author returns the stored message instead of a second one (failed-messages). After `SaveChangesAsync` it calls `IPopkinNotifier.MessageAdded`.
- **`Message`** — entity: `Id`, `ThreadId`, `AuthorMembershipId`, `Text?`, `PhotoId?`, `ReplyToMessageId?`, `ClientMessageId`, `SentAt`, `Kind` (`MessageKind` `Member` | `System`). This design adds `DeletedAt?` to the shared entity list, for L2-024 and L2-025 AC4 (react-to-message).
- **`ChatThread`** — entity: `Id`, `PopkinId`, `Kind` (`ThreadKind` `Everyone` | `Direct`), `MemberAId?`, `MemberBId?`. The Everyone thread is created with its Popkin by the start-a-Popkin feature; this slice reads it only.
- **`MessageConfiguration`**, **`ChatThreadConfiguration`** — EF Core configurations in Infrastructure. `MessageConfiguration` declares the index `(ThreadId, SentAt, Id)` for paging and the unique index `(AuthorMembershipId, ClientMessageId)` for idempotent sends. `IAppDbContext` gains `DbSet<ChatThread>` and `DbSet<Message>`; today it exposes only `SaveChangesAsync` (existing).
- **Existing infrastructure used as is** — cookie authentication with 401 instead of redirects, the fallback policy that requires an authenticated user, `AddProblemDetails`, and the `TimeProvider` singleton in `backend/src/Popkin.Api/Program.cs`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-021` | `L1-007` | Send a message to everyone: The Everyone thread is the heart of a Popkin. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-052` | `L1-012` | Input is validated and output is encoded: Nothing a person types can harm another person or the system. |
| `L2-053` | `L1-012` | Abuse is limited: One person cannot flood the system or another person. |

## Diagrams

### System context

A member reads and posts to the Everyone thread of a Popkin through the Popkin system. No external
system takes part in this slice.

![C4 system context for sending a message to everyone](diagrams/c4-context.png)

### Containers

The web app loads the thread and posts messages to the Popkin API over HTTPS; the API stores them in
the Popkin database and pushes `MessageAdded` back over the SignalR connection.

![C4 container view for sending a message to everyone](diagrams/c4-container.png)

### Components

`GroupChatPage` reads `ThreadStore`, which calls `ChatApi`. In the API, `MessagesController`
dispatches `SendMessageCommand`; its handler checks membership, saves the `Message` and publishes
through `SignalRPopkinNotifier`.

![C4 component view for sending a message to everyone](diagrams/c4-component.png)

### Class structure

A `ChatThread` holds many `Message` rows. `SendMessageCommandHandler` handles `SendMessageCommand`,
depends on `IMembershipGuard`, `IAppDbContext` and `IPopkinNotifier`, and checks
`PopkinSpace.EnsureActive`. On the client, `GroupChatPage` reads `ThreadStore`, which depends on the
`ChatApi` contract through `CHAT_API`.

![Class diagram for sending a message to everyone](diagrams/class-structure.png)

### Behaviour — open the Everyone thread

The page shows skeletons after 300 ms, loads the thread header and the latest 50 messages, then shows
either the thread or the empty state with openers. A non-member receives 404 `popkin_not_found`
(L2-051 AC1); a failed load shows the error state.

![Sequence diagram for opening the Everyone thread](diagrams/sequence-open-everyone.png)

### Behaviour — send a message

The composer appends a pending message at once and empties the field (L2-021 AC5). The API applies
the rate limit (L2-053 AC2), validation (L2-052 AC1) and the wrapped-up rule (L2-045 AC2), stores the
message once per `ClientMessageId`, and notifies the Popkin group.

![Sequence diagram for sending a message to everyone](diagrams/sequence-send-message.png)
