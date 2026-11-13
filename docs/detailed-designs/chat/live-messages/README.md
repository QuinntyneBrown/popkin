# Messages arrive as they are sent

## Overview

Members of a *Popkin* talk in the shared *Everyone* thread and in *direct messages*. The requirements
say plainly that chat is live: a message shows on every other member's screen as it is sent, without
a reload, and every place that counts unread messages keeps up. This feature is the real-time
backbone of the chat subsystem and the read-state rules that go with it.

- **hub** — the SignalR endpoint `PopkinHub` at `/hubs/popkin` that keeps one connection open per signed-in browser tab
- **group** — named set of connections that receive the same event; chat uses `popkin:{popkinId}`
- **event** — message pushed from the API to clients: `MessageAdded`, `MessageDeleted`, `ReactionsChanged`, `ThreadRead`, `PresenceChanged`
- **state event** — event that carries the full current value and a version that only rises; an older one is dropped
- **fact event** — event that is final and idempotent: applying it twice, or before the fact it refers to, ends in the same state
- **recovery read** — HTTP read that gives a client the state an event would have given it
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
- Hub events (server to client): `MessageAdded(MessageDto)`, `MessageDeleted(threadId, messageId)`, `ReactionsChanged(threadId, messageId, version, ReactionDto[])`, `ThreadRead(threadId)`, `PresenceChanged(popkinId, version, hereNow)`. `PhotoAdded` and the wrap-up event are owned by the photos and wrap-up designs and travel the same connection. The hub exposes no client-to-server methods for chat.
- `GET /api/popkins/{popkinId}/presence` — 200 `{ version, hereNow }`; the recovery read of `PresenceChanged`. 404 `popkin_not_found`.
- `GET /api/popkins/{popkinId}/threads/{threadId}/messages?from={id}&to={id}` — 200 `MessagePageDto` for the window between two messages, both included; the recovery read for messages already on screen. A deleted message is absent from it.

**Backend (Popkin API):**

- **`PopkinHub`** — `[Authorize]` `Hub<IPopkinClient>` mapped at `/hubs/popkin`, authenticated by the existing session cookie. It is a transport and holds no rule: what it must decide, it asks of a MediatR request, as a controller does (`AGENTS.md`). It accepts a connection only from the app's own origin. `OnConnectedAsync` loads the caller's active memberships and adds the connection to each `popkin:{popkinId}` group, then records presence. `OnDisconnectedAsync` releases presence. A session revoked by sign-out stops the connection at the next request; closing open connections at sign-out is `<TO SUPPLY>`.
- **`IPopkinClient`** (`Popkin.Application.Abstractions`) — one method per event, each taking DTOs from `Popkin.Application`: `MessageAdded`, `MessageDeleted`, `ReactionsChanged`, `ThreadRead`, `PresenceChanged`, and the methods the other designs add. A renamed event fails the build on the server; on the client the names live in one typed map (`hub-events.ts` in the `api` library) that `SignalRPopkinRealtime` alone reads.
- **`PersonUserIdProvider`** — `IUserIdProvider` that returns the `PersonId` claim, so `Clients.User(personId)` reaches every tab and device of one person.
- **`SignalRPopkinNotifier`** — implementation of `IPopkinNotifier` over `IHubContext<PopkinHub>`. Everyone events go to `popkin:{popkinId}`. Direct-thread events go to `Clients.Users(personA, personB)` only (direct-messages). `ThreadRead` goes to `Clients.User(personId)`. Joining or leaving a Popkin (invite and leave features) adds or removes the person's connections from its group through the same notifier.
- **`PresenceTracker`** — singleton map of connection ids to Popkins. It returns the here-now count, counting a person once however many tabs they hold, and the hub broadcasts `PresenceChanged` when the count changes. It guards its map with one lock, because many connections read and write it at once. It keeps a version per Popkin that rises with every change of the count, and `PresenceChanged` carries it. A dropped connection releases presence only after a grace period of 20 seconds without a reconnect by the same person, so "here now" does not flicker with every tunnel; the grace is a timer built from `TimeProvider`. The tracker is in-process, which is correct for the one API instance of [ADR 0009](../../../adr/0009-one-api-instance.md).
- **`MarkThreadReadCommand`** / **`MarkThreadReadCommandHandler`** — membership, `ChatThread.CanRead`, then `ThreadReadState.Advance(message, now)`, which never moves the read point backwards. When it moves, the handler sends `ThreadRead`. Marking read is allowed in a wrapped-up Popkin.
- **`GetMessagesQueryHandler`** — keyset paging on `(SentAt, Id)` through the index `(ThreadId, SentAt, Id)`, at most 50 per page (L2-027 AC5), returning `hasMore`.
- **Delivery budget** — the send handler notifies after `SaveChangesAsync` inside the same request; there is no queue between store and push. Meeting 1 second end to end at 100 ms latency (L2-027 AC1) is measured, not asserted in a test: the notifier records `popkin.hub.send.duration`, the time from the commit to the end of the hub send, by event name ([ADR 0012](../../../adr/0012-opentelemetry.md)). The Playwright behaviour test, with the hub stubbed ([ADR 0010](../../../adr/0010-the-hub-in-tests.md)), proves that an arriving event shows without a reload. Every send is awaited and names a group or users; a failed send is logged and counted, never dropped silently. A load target for concurrent connections is `<TO SUPPLY>`.
- **Order of events** — two requests that commit in one order can push in the other, because the push follows the commit with no queue. The client therefore never relies on arrival order. `MessageAdded` and `MessageDeleted` are fact events: messages are ordered by `(SentAt, Id)`, not by arrival. `ReactionsChanged` and `PresenceChanged` are state events: `Message.ReactionsVersion` and the tracker's version rise with every change, and a client drops an event whose version is not above the one it holds.

**Frontend (Popkin web app, `api` library):**

- **`PopkinRealtime` / `POPKIN_REALTIME` / `SignalRPopkinRealtime`** — root service that opens one `HubConnection` with `withAutomaticReconnect` once a person is signed in, and exposes `state` and one observable per event plus `reconnected$`. The reconnect delays are 0, 2, 10 and 30 seconds after each failure, then every 30 seconds without limit: people are at a campsite or in a basement venue, and a tab left open must come back by itself. The client is `@microsoft/signalr` from npm, on the release line of the server's ASP.NET Core and updated with it. It uses `invoke` where the caller needs the outcome and `send` where it does not.
- **`ThreadStore`** — applies events for its thread. It drops an event whose `Id` or `ClientMessageId` it already shows, so the sender's own echo and a retried send never duplicate. It tracks `atBottom` from the scroll position. At the bottom it appends and keeps the latest in view; otherwise it appends without moving the view and raises `newMessagesBelow`, which the page shows as a "New messages" control that scrolls to the latest (L2-027 AC2). `loadOlder()` prepends a page and restores the scroll offset by the height added, so the view does not jump (L2-027 AC5, L2-055 AC5). `catchUp()` runs on `reconnected$`: it fetches `after` the newest shown message until `hasMore` is false, then re-fetches the loaded window (`from` its oldest to its newest message) and replaces what it shows with the answer, so a message deleted or reacted to while the connection was down is corrected. A `MessageDeleted` for a message the store does not hold is remembered by id, and a later `MessageAdded` for that id is dropped; a delete that overtakes its own message therefore leaves nothing on screen.
- **Read point** — an `IntersectionObserver` on the last message calls `ChatApi.markRead` when the latest message is in view and the tab is visible (L2-027 AC4), at most once per message.
- **`UnreadTracker`** — root service that keeps counts per thread and totals per Popkin from `ThreadListDto` and the Popkin lists, and applies `MessageAdded` for threads not open in a visible tab and `ThreadRead` for any thread (L2-027 AC3, AC4). The Chat tab, the Popkin home and My Popkins read it. On `reconnected$` it reloads counts from the API.
- **Announcements** — each thread page holds a visually hidden `aria-live="polite"` region; each arriving message from someone else is announced as "{first name}: {text}", or "{first name} sent a photo" (copy `<TO SUPPLY>`) (L2-027 AC6). Messages loaded by paging or catch-up are not announced one by one; the summary for a catch-up is `<TO SUPPLY>`.

### Events and their recovery reads

An event is a hint that the state changed, never the only way to learn it. Every event that
travels `PopkinHub` is listed here with its kind and the read that recovers it; a design that
adds an event adds its row. `PopkinRealtime.reconnected$` triggers each read for the screens that
are open.

| Event | Kind | Missed while disconnected | Recovery read | Run by |
|---|---|---|---|---|
| `MessageAdded` | fact | New messages | `GET …/messages?after={id}` | `ThreadStore.catchUp()` |
| `MessageDeleted` | fact | A message on screen was deleted | `GET …/messages?from={id}&to={id}`, the loaded window | `ThreadStore.catchUp()` |
| `ReactionsChanged` | state | Reactions on a message on screen | The same window read | `ThreadStore.catchUp()` |
| `ThreadRead` | fact | Read on another device | `GET /api/popkins/{popkinId}/threads` and the Popkin lists | `UnreadTracker` |
| `PresenceChanged` | state | "5 here now" | `GET /api/popkins/{popkinId}/presence` | `ThreadStore` and the Popkin home |
| `CallChanged` | state | The call banner's count | `GET /api/popkins/{popkinId}/calls/current` | The banner's pages ([Group call](../../calls/group-call/README.md)) |
| `CallEnded` | fact | The banner should be gone | The same read; `204` removes the banner | The banner's pages |
| `ParticipantJoined`, `ParticipantLeft`, `ParticipantMediaChanged` | fact, fact, state | Who is on the call, and their microphone and camera | `POST …/calls`, which answers the participants, on rejoining | `CallSession` |
| `Signal` | fact (an edge) | An offer, answer or candidate | None: a lost signal is not recovered; `CallSession` restarts negotiation with that participant | `CallSession` |
| `PhotoAdded` | fact | New photos | The album's first page and the Popkin home's photo strip | The album and home pages |
| `MemberUpdated` | state | A member's name or photo | `GET /api/popkins/{popkinId}` | `CurrentPopkinStore` |
| `PopkinWrappedUp` | fact | The Popkin ended; the screen should be the recap | `GET /api/popkins/{popkinId}`; `status` `wrappedUp` opens the recap | `CurrentPopkinStore` ([Time is up](../../wrap-up/time-is-up/README.md)) |
| `PopkinLengthChanged` | state | The time left is wrong | `GET /api/popkins/{popkinId}`; `endsAt` | `CurrentPopkinStore` |

### Tests

- **API tests** (`Popkin.Api.Tests`, [ADR 0010](../../../adr/0010-the-hub-in-tests.md)) —
  `ApiFactory.CreateHubConnectionAsync(client)` connects a real SignalR client through the test
  server's handler on long polling, carrying the client's session cookie and
  `Sec-Fetch-Site: same-origin`. `HubEvents` in `Support/` collects events into a channel and
  awaits the first that matches, with a timeout that fails naming the events received. The first
  hub slice proves: a connection without a session is refused (L2-050 AC4); a person who is not
  a member receives nothing from a Popkin (L2-051); a direct message reaches exactly two people.
  No test sleeps.
- **Unit tests** (`api` library, [ADR 0011](../../../adr/0011-unit-tests-for-frontend-logic.md))
  — `ThreadStore` and `UnreadTracker`: a duplicate and an echo, a delete before its add, a stale
  state event, the window replaced after a catch-up.
- **Playwright** — the hub stubbed by `e2e/fixtures/hub.ts`; a spec pushes `MessageAdded` and
  sees the message, the "New messages" control or the unread count.

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

After a drop the client reconnects with back-off, the hub rejoins its groups, and the client runs
the recovery read of every event for the screens that are open (the table above) before the outbox
sends anything waiting. The diagram shows the reads for messages and counts.

![Sequence diagram for reconnecting and catching up](diagrams/sequence-reconnect-catch-up.png)
