# Messages arrive as they are sent

## Overview

Members of a *Popkin* talk in the shared *Everyone* thread and in *direct messages*. The requirements
say plainly that chat is live: a message shows on every other member's screen as it is sent, without
a reload, and every place that counts unread messages keeps up. This feature is the real-time
backbone of the chat subsystem and the read-state rules that go with it.

- **hub** — the SignalR endpoint `PopkinHub` at `/hubs/popkin` that keeps one connection open per signed-in browser tab
- **group** — named set of connections that receive the same event; chat uses `popkin:{popkinId}`
- **event** — message pushed from the API to clients: `MessageAdded`, `MessageDeleted`, `ReactionsChanged`, `ThreadRead`, `PresenceChanged`
- **catch-up** — fetch of the messages and counts missed while a connection was down
- **unread count** — messages by others in a thread after the member's last read point (`ThreadReadState`)
- **here now** — number of members of a Popkin who hold an open connection

The send path (send-message-to-everyone) stores a message and calls `IPopkinNotifier`; this feature
carries the event to the right connections within 1 second on a connection with 100 ms latency. A
member reading the latest message sees the new one appended; a member reading older messages keeps
their place and gets a "New messages" control; a member elsewhere sees the unread count rise on the
Chat tab, the Popkin home and My Popkins. Opening a thread with its latest message in view sets its
count to zero everywhere. Long threads load the latest 50 messages and fetch earlier ones as the
member scrolls up. Assistive technology hears each arrival politely with its sender.

## Description

**Screens and states:**

- `docs/mocks/pages/group-chat/default.html` and `docs/mocks/pages/direct-message/default.html` — threads that receive live messages; the header "14 members · 5 here now".
- `docs/mocks/pages/conversations/default.html` — unread badge and dots that rise live (L2-027 AC3).
- `docs/mocks/notifications/banner/info.html` — "Chat 3 new" on the Popkin home.
- `docs/mocks/notifications/banner/danger.html` — offline banner shown while the connection is down (failed-messages).
- No mock draws the "New messages" control (L2-027 AC2) or a failed load of earlier messages; both are `<TO SUPPLY>` mock states.

**API:**

- `GET /hubs/popkin` (negotiate and WebSocket) — requires a session; 401 without one (L2-050 AC4).
- `GET /api/popkins/{popkinId}/threads/{threadId}/messages?before={id}&limit=50` and `?after={id}&limit=50` — 200 `MessagePageDto { items, hasMore }`; 404 `popkin_not_found`, `thread_not_found`.
- `PUT /api/popkins/{popkinId}/threads/{threadId}/read` with `{ lastReadMessageId }` — 204; 400 `message_not_found` when the message is not in the thread; 404 `thread_not_found`.
- Hub events (server to client): `MessageAdded(MessageDto)`, `MessageDeleted(threadId, messageId)`, `ReactionsChanged(threadId, messageId, ReactionDto[])`, `ThreadRead(threadId)`, `PresenceChanged(popkinId, hereNow)`. `PhotoAdded` and the wrap-up event are owned by the photos and wrap-up designs and travel the same connection. The hub exposes no client-to-server methods for chat.

**Backend (Popkin API):**

- **`PopkinHub`** — `[Authorize]` hub mapped at `/hubs/popkin`, authenticated by the existing session cookie. It accepts a connection only from the app's own origin. `OnConnectedAsync` loads the caller's active memberships and adds the connection to each `popkin:{popkinId}` group, then records presence. `OnDisconnectedAsync` releases presence. A session revoked by sign-out stops the connection at the next request; closing open connections at sign-out is `<TO SUPPLY>`.
- **`PersonUserIdProvider`** — `IUserIdProvider` that returns the `PersonId` claim, so `Clients.User(personId)` reaches every tab and device of one person.
- **`SignalRPopkinNotifier`** — implementation of `IPopkinNotifier` over `IHubContext<PopkinHub>`. Everyone events go to `popkin:{popkinId}`. Direct-thread events go to `Clients.Users(personA, personB)` only (direct-messages). `ThreadRead` goes to `Clients.User(personId)`. Joining or leaving a Popkin (invite and leave features) adds or removes the person's connections from its group through the same notifier.
- **`PresenceTracker`** — singleton map of connection ids to Popkins. It returns the here-now count, counting a person once however many tabs they hold, and the hub broadcasts `PresenceChanged` when the count changes. The tracker is in-process; running more than one API instance needs a SignalR backplane and a shared presence store, both `<TO SUPPLY>`.
- **`MarkThreadReadCommand`** / **`MarkThreadReadCommandHandler`** — membership, `ChatThread.CanRead`, then `ThreadReadState.Advance(message, now)`, which never moves the read point backwards. When it moves, the handler sends `ThreadRead`. Marking read is allowed in a wrapped-up Popkin.
- **`GetMessagesQueryHandler`** — keyset paging on `(SentAt, Id)` through the index `(ThreadId, SentAt, Id)`, at most 50 per page (L2-027 AC5), returning `hasMore`.
- **Delivery budget** — the send handler notifies after `SaveChangesAsync` inside the same request; there is no queue between store and push. Meeting 1 second end to end at 100 ms latency (L2-027 AC1) is checked by a behaviour test with the hub stubbed in Playwright; a load target for concurrent connections is `<TO SUPPLY>`.

**Frontend (Popkin web app, `api` library):**

- **`PopkinRealtime` / `POPKIN_REALTIME` / `SignalRPopkinRealtime`** — root service that opens one `HubConnection` with `withAutomaticReconnect` once a person is signed in, and exposes `state` and one observable per event plus `reconnected$`. The reconnect delays (design value 0, 2, 10 and 30 s, then every 30 s) are `<TO SUPPLY>`. The SignalR client package version is `<TO SUPPLY>`.
- **`ThreadStore`** — applies events for its thread. It drops an event whose `Id` or `ClientMessageId` it already shows, so the sender's own echo and a retried send never duplicate. It tracks `atBottom` from the scroll position. At the bottom it appends and keeps the latest in view; otherwise it appends without moving the view and raises `newMessagesBelow`, which the page shows as a "New messages" control that scrolls to the latest (L2-027 AC2). `loadOlder()` prepends a page and restores the scroll offset by the height added, so the view does not jump (L2-027 AC5, L2-055 AC5). `catchUp()` runs on `reconnected$`: it fetches `after` the newest shown message until `hasMore` is false.
- **Read point** — an `IntersectionObserver` on the last message calls `ChatApi.markRead` when the latest message is in view and the tab is visible (L2-027 AC4), at most once per message.
- **`UnreadTracker`** — root service that keeps counts per thread and totals per Popkin from `ThreadListDto` and the Popkin lists, and applies `MessageAdded` for threads not open in a visible tab and `ThreadRead` for any thread (L2-027 AC3, AC4). The Chat tab, the Popkin home and My Popkins read it. On `reconnected$` it reloads counts from the API.
- **Announcements** — each thread page holds a visually hidden `aria-live="polite"` region; each arriving message from someone else is announced as "{first name}: {text}", or "{first name} sent a photo" (copy `<TO SUPPLY>`) (L2-027 AC6). Messages loaded by paging or catch-up are not announced one by one; the summary for a catch-up is `<TO SUPPLY>`.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-027` | `L1-007` | Messages arrive as they are sent: Chat is live. |
| `L2-050` | `L1-012` | Every request is authenticated: Nothing private is served without a session. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-055` | `L1-013` | Screens are fast: Popkin feels immediate on a phone. |

## Diagrams

### System context

One member sends a message through Popkin, and Popkin delivers it within 1 second to every other
member with the thread open.

![C4 system context for live messages](diagrams/c4-context.png)

### Containers

The web app keeps one SignalR connection to `PopkinHub` in the Popkin API and uses HTTPS for
catch-up and read state; the API reads and writes the Popkin database.

![C4 container view for live messages](diagrams/c4-container.png)

### Components

`SignalRPopkinRealtime` connects to `PopkinHub`, which identifies users with
`PersonUserIdProvider` and tracks `PresenceTracker`. `SignalRPopkinNotifier` sends through the hub
context. On the client, `ThreadStore` and `UnreadTracker` consume the events, and the store marks
threads read through `MarkThreadReadCommandHandler`.

![C4 component view for live messages](diagrams/c4-component.png)

### Class structure

`SignalRPopkinNotifier` realises `IPopkinNotifier` over `PopkinHub`. `MarkThreadReadCommandHandler`
advances `ThreadReadState`. On the client, `SignalRPopkinRealtime` realises `PopkinRealtime`, which
`ThreadStore` and `UnreadTracker` inject through `POPKIN_REALTIME`.

![Class diagram for live messages](diagrams/class-structure.png)

### Behaviour — open the real-time connection

The hub refuses a connection without a session (L2-050 AC4); otherwise it joins the caller to each
of their Popkins' groups and publishes the here-now count.

![Sequence diagram for opening the real-time connection](diagrams/sequence-connect.png)

### Behaviour — deliver a new message

The notifier routes Everyone messages to the Popkin group and direct messages to the two people. Each
client appends the message, shows "New messages", or raises an unread count, and announces it
politely.

![Sequence diagram for delivering a new message](diagrams/sequence-deliver-message.png)

### Behaviour — mark a thread read

When the latest message is in view, the client moves the read point forward and the API tells every
tab and device of that person, so the count is zero everywhere (L2-027 AC4).

![Sequence diagram for marking a thread read](diagrams/sequence-mark-read.png)

### Behaviour — load earlier messages

Scrolling up fetches 50 earlier messages and restores the scroll offset, so the view does not jump
(L2-027 AC5).

![Sequence diagram for loading earlier messages](diagrams/sequence-load-older.png)

### Behaviour — reconnect and catch up

After a drop the client reconnects with back-off, the hub rejoins its groups, and the client fetches
the messages and counts it missed before the outbox sends anything waiting.

![Sequence diagram for reconnecting and catching up](diagrams/sequence-reconnect-catch-up.png)
