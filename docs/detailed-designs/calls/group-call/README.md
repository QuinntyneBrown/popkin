# Start or join a group call

## Overview

Popkin is a free platform for pop-up communities. Each Popkin is a private space for one group,
and its members chat, call, share photos and rate experiences together. This feature covers how
a call begins and ends. A member starts a video call for the whole Popkin with one tap, and
others join it from a banner. A member also calls one other member from a direct message, a
direct call, which journey 11 built.

- **group call** — video call open to every member of one Popkin (L1 Terms)
- **direct call** — video call between the two members of one direct message (L2-030 AC8)
- **call under way** — call whose `EndedAt` is empty; a Popkin has at most one group call under
  way, and a direct message at most one direct call
- **participant** — member who is on a call
- **call banner** — line on the Popkin home and in the Everyone thread that says how many are on
  the group call under way and offers "Join", or "Return" to a member who is on it; in a direct
  message, the same line for its direct call
- **signal** — WebRTC session description (`offer`, `answer`) or ICE `candidate` that two
  browsers exchange to set up a media path
- **link** — media path between the member's browser and one other participant's
- **media relay** — external STUN/TURN service that lets browsers find a path to each other and
  relays media when a direct path fails

Audio and video travel over WebRTC between browsers. The Popkin API never carries media. It
records who is on which call, relays signals over the SignalR hub `PopkinHub`, and hands each
participant short-lived credentials for the media relay. A call is a mesh
([ADR 0014](../../../adr/0014-calls-are-a-mesh.md)): each browser holds one link to each other
browser on the call. The frontend hides the topology behind `PeerLinks`, so a selective
forwarding unit (SFU) later replaces one class and the relay settings, not the pages, the
session or the hub's contract.

The companion feature [call controls](../call-controls/README.md) covers the tiles, mute, camera,
leave and minimise (L2-030). This feature owns the call's life: start, join, the banner, the
waiting, permission and failure states, signalling, and the end of the call.

## Description

### Screens and states

- `docs/mocks/pages/video-call/loading.html` — "Connecting…" under the Popkin's name and
  "Joining the call…", "Getting your camera and microphone ready." with a spinner while media and
  the join request are in flight.
- `docs/mocks/pages/video-call/default.html` — the header "🏕️ Lakeside Weekend", "6 on the call ·
  12:48", and the tiles (L2-029 AC5).
- `docs/mocks/pages/video-call/empty.html` — "Just you · 0:12", the member's own tile, "Waiting
  for the others", "Everyone in {Popkin} can see the call and join with one tap." and "Invite to
  call" (L2-029 AC3).
- `docs/mocks/pages/video-call/error.html` — "Not connected", "We can’t reach your camera or
  microphone", "Allow them for Popkin in your browser’s site settings, then try again.", "Try
  again" and "Back to the Popkin" (L2-029 AC4).
- `docs/mocks/pages/video-call/two.html` — the direct call: the header names the other member,
  "Just the two of you · 12:48" (L2-030 AC8). The mock also draws "Invite to call" and "12
  others in Lakeside Weekend can join anytime.", which a direct call does not allow (known
  gap 65).
- `docs/mocks/notifications/banner/info.html` — the call banner on the Popkin home: "Group call ·
  6 on the call" with "Join" (L2-029 AC2).
- `docs/mocks/pages/direct-message/call.html` — the banner of a direct call in its direct
  message: "Call · 1 on the call" with "Join". Added in journey 11.
- Entry points: "Group call" on `docs/mocks/pages/popkin-home/default.html` and "Start group
  call" on `docs/mocks/pages/group-chat/default.html`; "Call Walt" in the top bar and the person
  pane of `docs/mocks/pages/direct-message/default.html`.

Three states have no mock. A direct call with the member alone on it says "Waiting for {first
name}" and "{first name} sees the call in your chat and can join with one tap.", copy chosen in
journey 11. A call that cannot be joined, or is lost, shows the layout of
`error.html` with "We couldn’t connect you to the call" and "Check your connection, then try
again." The call banner inside the Everyone thread reuses the home banner. The overflow above 12
people (L2-029 AC7) is drawn by the design system only (`call-tile--rest` in
`docs/design-system/components/call-tile.html`); its rule is in
[call controls](../call-controls/README.md).

### API

- `GET /api/popkins/{popkinId}/calls/current?threadId=` — `200 OK` with a `CallDto` (`id`,
  `threadId`, `startedAt`, `version`, `participantCount`) for the group call under way, or with
  `threadId` the direct call of that direct message, or `204 No Content`.
  `404 popkin_not_found` for a non-member; `404 thread_not_found` for anyone but the two members
  of the direct message named. Everyone's thread id names the group call.
- `POST /api/popkins/{popkinId}/calls` with `{ micOn?, cameraOn?, threadId? }`, each of the two
  on when left out — starts or joins the group call, or with `threadId` the direct call of that
  direct message. `201 Created` when the call starts, `200 OK` when the caller joins one under
  way. Body: `JoinedCallDto` (`call`, `viewerMembershipId`, `participants` in the order they
  joined, `iceServers`). It is idempotent: a member who is on the call already gets `200` and
  the same answer, and nothing changes or is announced. Errors: `404 popkin_not_found`,
  `409 popkin_wrapped_up`, checked before the thread, and `404 thread_not_found`.
- `POST /api/popkins/{popkinId}/calls/{callId}/leave` — `204 No Content`. `404 call_not_found`
  when the caller is not on that call. A wrapped-up Popkin does not refuse it.
- `PopkinHub` (`/hubs/popkin`): client methods `JoinCall(callId)` and
  `SendSignal(callId, toMembershipId, signal)`. Both are called with `invoke`: the caller needs
  the outcome of each, and a refused signal must be known or a call would never connect. Server
  events `CallChanged(popkinId, callId, version, participantCount, threadId)` and
  `CallEnded(popkinId, callId, threadId)` on `popkin:{popkinId}` for the group call, whose
  `threadId` is null, and for a direct call to the two members alone, who have not left, on
  every connection they hold; `ParticipantJoined(callId, participant)`
  and `ParticipantLeft(callId, membershipId)` on `call:{callId}`;
  `Signal(callId, fromMembershipId, signal)` to the one connection it is for. The two banner
  events carry the Popkin's id because a connection is in the group of every Popkin its person
  belongs to. A refused hub call fails with the ProblemDetails `code` of the same refusal over
  HTTP (`call_not_found`, `validation_failed`, `rate_limited`), through `ProblemHubFilter`.

### Frontend (`frontend/projects/popkin`, `api`, `components`)

- **`VideoCallPage`** — `pages/video-call/video-call.page.ts`, selector `pk-video-call-page`,
  route `/p/:popkinId/call` behind `signedInGuard`, with route data `{ shell: 'bare', page:
  'video-call' }`. Opening it starts the call or joins the one under way. The page reads
  `CallSession` and composes `pk-call-screen`, `pk-top-bar`, `pk-call-grid`, `pk-call-tile`,
  `pk-call-controls`, `pk-call-aside`, `pk-stage-message` and `pk-button`. It declares no
  presentation of its own (ADR 0007). The stage is dark in both themes (L2-059 AC3). "Invite to
  call", in the top bar and in the waiting state, opens `InviteDialog`. The same page answers
  `/p/:popkinId/chat/:memberId/call` for a direct call: its heading is the other member's name,
  "Minimise call" returns to the direct message, and the waiting state reads "Waiting for {first
  name}" without "Invite to call"; the top bar keeps "Invite to call", as `two.html` draws it
  (known gap 65).
- **`CallSession`** (`api` library, `calls/call-session.ts`, with unit tests) — a concrete class
  provided in root, so a call outlives the page (minimise, L2-030 AC7). It has no contract and
  no token: pages inject the class, and its browser parts are behind `CALL_MEDIA`, `PEER_LINKS`
  and `SPEAKING_METER`, which the unit tests replace. `start(popkinId, returnUrl, memberId?)`
  asks for the microphone and camera, posts the join, opens the links, listens to the hub and
  calls `joinCall`; it then offers a link to everyone already on the call. With a `memberId` it
  first opens the direct message with that member through `ChatApi.openDirect`, keeps its
  thread id for every join, and sets `memberId` and `other`. `status` is `idle`, `connecting`,
  `connected`, `denied` or `failed`; `retry()` begins again from `denied` or `failed`.
  `subtitle` is "Connecting…", "Not connected", "Just you · 0:12" or "6 on the call · 12:48",
  and on a direct call "Just the two of you · 12:48" (`directCallSubtitle`); the time counts from
  the server's `StartedAt` and is redrawn every second (L2-029 AC5). The line under the list of
  who is on a direct call is "Only you and {first name} can join this call."
  (`directCallNote`). A `404` on the way in opens the not-found screen (L2-051 AC1); any other
  failure ends in `failed` with the microphone and camera stopped. The session holds one call:
  starting another, the group call while on a direct call or the reverse, leaves the first.
- **`CallMedia` / `CALL_MEDIA` / `BrowserCallMedia`** (`calls/call-media.ts`) — asks the browser
  for the microphone and the front camera. A refusal (`NotAllowedError`, `SecurityError`) is
  `denied`; anything else, a browser without `getUserMedia` included, is `failed`.
- **`PeerLinks` / `PEER_LINKS` / `WebRtcPeerLinks`** (`calls/peer-links.ts`,
  `calls/webrtc-peer-links.ts`) — one `RTCPeerConnection` per other participant.
  `WebRtcPeerLinks` alone touches WebRTC. `connect(membershipId)` offers; `receive` takes an
  offer, an answer or a candidate, and keeps a candidate that arrives before its description.
  The one who arrives offers to those already there. When both sides offer at once, after a
  reconnect, the side whose membership id sorts first gives way and answers. An offer from
  someone who already has a link begins that link anew. `lost$` names a link that failed, and
  the session begins it again.
- **`CallsApi` / `CALLS_API` / `HttpCallsApi`** — `getCurrent(popkinId, threadId?)`,
  `join(popkinId, media, threadId?)`, `leave(popkinId, callId)` and `setMedia`.
- **`PopkinRealtime` / `POPKIN_REALTIME` / `SignalRPopkinRealtime`** — the shared real-time
  client gains `joinCall`, `sendSignal` and one observable per call event.
- **View models** (`lib/models/calls.ts`) — `CallView` (id, threadId, startedAt, version,
  participantCount), `CallParticipantView` (membershipId, firstName, name, avatar, micOn,
  cameraOn, mediaVersion, joinedAt), `JoinedCallView`, `IceServerView`, `CallSignal` and
  `CallMediaState`.
- **Call banner** — `CallBannerStore` (`calls/call-banner-store.ts`, with unit tests), one per
  screen, provided by `PopkinHomePage` and `GroupChatPage`. It reads `CallsApi.getCurrent`,
  follows `CallChanged` and `CallEnded` for its Popkin, and reads again on `reconnected$`. The
  pages show `pk-banner` in the Popkin's colour, "Group call · {n} on the call", with one
  action that links to the call screen: "Return" for a member whose `CallSession` is on that
  call, "Join" for everyone else. The banner goes for everyone when the call ends
  (L2-029 AC6). A banner that cannot be read is not shown; the screen under it does not fail.
  `DirectMessagePage` provides one too, opened with the direct message's thread id: it reads
  `getCurrent(popkinId, threadId)`, follows only the events whose `threadId` is that thread's,
  and shows "Call · {n} on the call". It is how the other member learns of a direct call: there
  is no ringing and no notification, and a member who is not on the direct message's screen
  learns nothing (known gap 12).
- **Signals are sent in order.** `CallSession` sends one signal at a time, so they arrive in
  the order they were made. A refused signal (the limit below, or a target that has left)
  begins the link to that participant again, once; a second refusal for the same participant
  moves the call to `failed`, which the page shows (L2-029 AC4).
- **After a reconnect** — on `reconnected$` the session posts the join again, which is safe
  because it is idempotent, takes the participants from the answer, and calls `joinCall` again
  so the new connection receives the call's events. When the member's `joinedAt` has changed,
  the grace period took them off the call while they were away: every link is begun again.
  Otherwise only the links to people who are new are offered. A different call id, or
  `CallEnded` for the call the member is on, ends in `failed`.
- **"Call {first name}"** — in the top bar of `DirectMessagePage` and in its person pane from
  1280 px, a link to `/p/:popkinId/chat/:memberId/call` (route data `{ shell: 'bare', page:
  'video-call' }`), which opens `VideoCallPage` with the member (L2-030 AC8). It is hidden in a
  wrapped-up Popkin.

### Backend

- **`CallsController`** — `/api/popkins/{popkinId}/calls`. Requires an authenticated caller
  through the fallback policy (L2-050 AC1) and dispatches to MediatR.
- **`JoinCallCommand` / `JoinCallCommandHandler`** (`Calls/JoinCall.cs`) — the handler loads the
  caller's membership through `IMembershipGuard.RequireActiveMemberAsync`, so a non-member gets
  `404 popkin_not_found` (L2-051 AC1) and a wrapped-up Popkin `409 popkin_wrapped_up`
  (L2-045 AC1). A `ThreadId` is then resolved by `CallReads.CallThreadIdAsync`: a direct
  message only its two members may name, anyone else getting `404 thread_not_found`
  (`ChatThreads.RequireAsync`, L2-023 AC2), and Everyone's thread names the group call. It finds
  the `Call` under way, the group call or that thread's direct call, or starts one, adds
  a `CallParticipant` with `MicOn` and `CameraOn` as sent, and saves in one unit of work, which
  raises `Call.Version`. After the commit it sends `ParticipantJoined` to `call:{callId}` and
  `CallChanged` to the call's `Audience` (`CallReads.AudienceAsync`): the Popkin for the group
  call, the two members for a direct call. It returns the call, the participants and the ICE servers from
  `IMediaRelayCredentials`. A join that loses to another change of the same call, two members
  who start at once included, is made again on the call as it then stands, up to three times.
  There is no validator class: the handler checks, as every handler does.
- **`LeaveCallCommand` / `LeaveCallCommandHandler` / `CallLeaver`** (`Calls/LeaveCall.cs`) —
  `CallLeaver` takes a participant off their call, for "Leave" and for a dropped connection
  alike. It sets `LeftAt`; when no participant remains it sets `Call.EndedAt`. After the commit
  it removes the participant's connection from `call:{callId}`, sends `ParticipantLeft`, and
  sends `CallEnded`, or `CallChanged` with the new count, to the call's audience.
- **`GetCurrentCallQuery` / `GetCurrentCallQueryHandler`** — returns the group call under way,
  or with a `ThreadId` the direct call of that direct message, or `null`; the thread is
  resolved as on the join.
- **Wrap-up** — `PopkinWrapUpService` ends every call under way in the Popkin, the group call
  and each direct call, and sends each `CallEnded` to its own audience before `PopkinWrappedUp`.
- **`PopkinHub`** — introduced by the real-time design and shared here. It refuses a connection
  without a valid session (L2-050 AC4). It is a transport: each method checks nothing itself and
  sends one MediatR request, as a controller does. `JoinCall` sends `JoinCallGroupCommand`;
  `SendSignal` sends `RelaySignalCommand`.
- **`JoinCallGroupCommand` / `JoinCallGroupCommandHandler`** — finds the person's
  `CallParticipant` whose `LeftAt` is empty, or fails with `call_not_found`. It records the
  connection as `CallParticipant.ConnectionId`, removes the connection it replaces from
  `call:{callId}` and adds the new one, through `IPopkinConnections`.
- **`RelaySignalCommand` / `RelaySignalCommandHandler`** (`Calls/RelaySignal.cs`) — the handler
  holds the rules of `CallSignalDto` (L2-052 AC1): `type` is `offer`, `answer` or `candidate`;
  the payload is at most 32 KB for an offer or an answer and 2 KB for a candidate; anything else
  is `validation_failed`. It checks that the caller and the target are both participants of the
  call and that the target has a connection on it, or fails with `call_not_found`, and sends
  `Signal` to that connection. It never reads the payload.
- **Signals are edges.** Each `offer`, `answer` and `candidate` must arrive. The hub never
  coalesces them, never deduplicates them by content and never drops one under load; a dropped
  candidate can leave a call that never connects, and looks like an intermittent failure for a
  long time before anyone finds the cause. A signal that is not relayed fails the hub call.
- **Limits on what the hub accepts** — SignalR's maximum receive size is set to 64 KB (the
  default is 32 KB), because a session description with several media sections and the JSON
  envelope can pass the default; nothing larger is read, and the proxy must allow as much on
  `/hubs` ([`docs/deployment.md`](../../../deployment.md)). `SendSignal` is limited per
  connection to 600 signals a minute by `SignalRateLimitFilter`
  ([Abuse limits](../../security/abuse-limits/README.md)), well above what setting up a call
  with 12 people needs. Detailed hub errors are on in Development only.
- **Disconnect grace period** — `DisconnectFromHubCommandHandler`, which `OnDisconnectedAsync`
  sends to, starts `CallDisconnectGrace` for each participant the dropped connection was on a
  call with. After 20 seconds `LeaveDroppedCallCommand` takes the participant off the call,
  unless `JoinCall` has replaced their `ConnectionId` in the meantime. The client retries 0, 2
  and 10 seconds after a drop ([Live messages](../../chat/live-messages/README.md)), so its
  first three attempts, at 0, 2 and 12 seconds, all fall inside the grace. The grace is a timer
  built from `TimeProvider`, so its test advances the fake clock and never waits. It lives in
  the API's memory (ADR 0009).
- **`IMediaRelayCredentials` / `TurnCredentialIssuer`** — the contract is in
  `Popkin.Application.Abstractions`, the issuer in `Popkin.Infrastructure/Media`. It follows the
  TURN REST shared-secret scheme, which coturn and the hosted relays take: the user name is
  `{expiry as Unix seconds}:{membershipId}` and the credential its HMAC-SHA1 under
  `MediaRelay:Secret`, in base64. Nothing calls the relay. The settings are `MediaRelay:Urls`,
  `MediaRelay:Secret` and `MediaRelay:CredentialLifetime`, one hour unless set
  ([`docs/deployment.md`](../../../deployment.md)). With no address configured the answer names
  no ICE server and browsers connect directly; with addresses and no secret the servers are
  named without credentials, which is all a STUN server takes.
- **`SignalRPopkinNotifier`** — implements `IPopkinNotifier` and gains `CallChanged`,
  `CallEnded`, `ParticipantJoined`, `ParticipantLeft`, `ParticipantMediaChanged` and `Signal`;
  `IPopkinClient` gains the same six events. Since journey 11 `CallChanged` and `CallEnded` take
  an `Audience` and carry the call's `threadId` as their last argument; an audience of people is
  sent with `Clients.Users`, never to the Popkin's group.
- **Order of events** — `CallChanged` is a state event: it carries the full participant count
  and `Call.Version`, and a banner drops one whose version is not above the one it holds, so two
  joins that push out of order still end on the right count. `CallEnded` is a fact event and is
  final: a banner that has seen it for a call ignores every later `CallChanged` for that call,
  so a late event cannot bring the banner back. On `reconnected$` the banner's stores read
  `GET …/calls/current` again.
- **Domain** — `Call` (`Id`, `PopkinId`, `ThreadId?`, `StartedAt`, `EndedAt?`, `Version`) and
  `CallParticipant` (`Id`, `CallId`, `MembershipId`, `JoinedAt`, `LeftAt?`, `MicOn`, `CameraOn`,
  `MediaVersion`, `ConnectionId?`). `ThreadId` names the direct message of a direct call and is
  null for the group call; there is no `Kind`, the thread says which call it is.
  `Call.Start(popkinId, now, threadId?)` starts either. `IAppDbContext` gains `DbSet<Call>` and
  `DbSet<CallParticipant>`; `CallConfiguration` and `CallParticipantConfiguration` map them, in
  the migrations `AddCalls` and, for `ThreadId`, `AddDirectMessages`. Two unique filtered
  indexes allow one group call under way per Popkin and one direct call under way per direct
  message, so a direct call and the group call run at once; another allows one participant per
  member per call at a time, and a member who comes back is a new participant. `ThreadId` is a
  foreign key to `ChatThread` that deletes nothing: the Popkin takes its calls with it. `Call.Version` is a counter the entity raises with every change to its
  participants, and a concurrency token, so two changes cannot both be saved from the same
  version. Every clock read uses `TimeProvider`.

### Tests

- API integration tests on InMemory, in `Popkin.Api.Tests/Calls/`: `StartCallTests`,
  `JoinCallTests`, `CurrentCallTests`, `LeaveCallTests`, `LiveCallBannerTests`,
  `CallParticipantsLiveTests`, `CallSignalTests`, `CallSignalRateLimitTests`,
  `CallDisconnectTests` and `MediaRelayCredentialsTests`, and for the direct call
  `DirectCallTests` and `LiveDirectCallTests`. The hub tests connect a real SignalR client in
  memory; the grace and the limit advance `FakeTimeProvider`.
- Unit tests of `CallSession`, against stand-ins for `PEER_LINKS`, `CALL_MEDIA` and
  `SPEAKING_METER`, of `CallBannerStore` and of the helpers in `call-text.ts`, each with the
  direct call.
- Playwright: `e2e/tests/group-call.spec.ts`, `e2e/tests/call-banner.spec.ts` and, for the
  direct call, "calling from a direct message" in `e2e/tests/direct-message.spec.ts`. The page's
  microphone and camera are stubbed and the hub is answered (ADR 0010).
- No test reaches a relay or a second machine (ADR 0014). Calls were checked by hand between
  two browsers on one machine.

### Built in journey 7

Everything above except the direct call, which journey 11 built (below).

Decided in the build:

- Media topology: a mesh, signalled through the hub
  ([ADR 0014](../../../adr/0014-calls-are-a-mesh.md)).
- Media relay: any TURN server that takes the shared-secret scheme; the credential lives one
  hour unless `MediaRelay:CredentialLifetime` says otherwise. Which relay a deployment runs is
  its own choice and needs no code.
- The signal sizes, 32 KB and 2 KB, held for the session descriptions a mesh produces.
- The "+N more" wording and who has a tile above 12 people:
  [call controls](../call-controls/README.md).

Gaps found, each in [the register](../../README.md#known-gaps):

- Nothing caps how many may join a call, and a mesh serves a large call badly (gap 27).
- A member who posted the join and never called `JoinCall`, because the tab closed in between,
  has no `ConnectionId` and no connection to drop. The join itself therefore starts the grace:
  `JoinCallCommandHandler` calls `CallDisconnectGrace.Start` for the new participant, and one
  with no connection on the call when it ends leaves it, which ends a call they were alone on
  (gap 28, settled).
- A call under way was not ended when its Popkin wrapped up. Journey 9, Wrap up, ends it with
  the Popkin: every participant is taken off it, and `CallEnded` is sent before
  `PopkinWrappedUp` when the Host wraps up. A change of microphone or camera afterwards answers
  `409 popkin_wrapped_up` (gap 30, settled by
  [The Host wraps up](../../wrap-up/host-wraps-up/README.md)).
- A member has one participant row however many devices they use. A second device's join adds
  nothing, and its `JoinCall` takes the call's events and signals from the first (gap 31).
- No relay was exercised by any test (gap 32).
- Calls add no instrument to the `Popkin` meter (gap 33).

### Built in journey 11

The direct call: `Call.ThreadId`, `threadId` on the join and on `GET …/calls/current`,
`404 thread_not_found`, the events of a direct call sent to its two members only, "Call {first
name}" and the call screen at `/p/:popkinId/chat/:memberId/call`, and the banner in the direct
message.

Decided in the build:

- How the other member learns of a direct call: from the banner "Call · {n} on the call" in the
  direct message, for now. Nothing rings and nothing is notified; that stays open (gap 12).
- Two calls at once: the API allows a direct call and the group call under way at the same
  time. A device holds one: its `CallSession` leaves the call it is on
  when the member starts or joins another.
- A call has no `Kind`: `ThreadId` null is the group call. Asking for Everyone's thread gives
  the group call.
- `409 popkin_wrapped_up` is checked before the thread on the join, so a wrapped-up Popkin
  answers `409` to anyone who is a member.
- A wrap-up ends every direct call with the group call.
- The events of a direct call reach only those of its two members who have not left.
- The waiting state of a direct call: "Waiting for {first name}" and "{first name} sees the call
  in your chat and can join with one tap.", drawn by no mock.

One gap was found: a direct call keeps "Invite to call" in its top bar, which opens the
Popkin's invite dialog, as `two.html` draws it, and the mock's line under the list of who is on
the call says that others can join (gap 65).

The diagrams below were not redrawn. They show the design as it stood before journey 7:
`CALL_SESSION` and `WebRtcCallSession` where there is now the class `CallSession` over
`PeerLinks`, a `Kind` on the call, `CallChanged` and `CallEnded` without the Popkin's id or the
thread's, `SendSignal` as a send, and a direct call opened at `/p/{popkinId}/call?thread=` with
the thread's id, where it is now `/p/{popkinId}/chat/{memberId}/call` with the member's
(gap 34).

### Open questions

- Whether a direct call rings the other member, or notifies them, when they are not on the
  direct message's screen: `<TO SUPPLY>`. No mock shows an incoming call (gap 12).
- Whether a cap on who may join is wanted; it needs a requirement first (ADR 0014, gap 27).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-029` | `L1-008` | Start or join a group call: One tap puts the whole Popkin on a video call. |
| `L2-030` | `L1-008` | Call controls: Each person controls their own microphone and camera. |
| `L2-045` | `L1-011` | A wrapped-up Popkin is read-only: Nothing new is added to a Popkin that has ended. |
| `L2-050` | `L1-012` | Every request is authenticated: Nothing private is served without a session. |
| `L2-051` | `L1-012` | Popkins are private to their members: Membership decides everything a person sees. |
| `L2-059` | `L1-014` | Light and dark themes: Popkin follows the device and the person. |

From `L2-030` this feature realises AC8, a call from a direct message, built in journey 11;
the other criteria belong to [call controls](../call-controls/README.md). From `L2-045` it enforces AC1 (no call can
be started), and from `L2-059` it realises AC3 for the call screen.

## Diagrams

### System context

A member reaches Popkin from a browser. The browser supplies the camera and microphone, and
media crosses the external media relay when browsers cannot reach each other directly.

![C4 system context for starting or joining a group call](diagrams/c4-context.png)

### Containers

The web app calls the Popkin API over HTTPS to start, join and leave. It signals over the
`PopkinHub` WebSocket, and sends media through the media relay. The API records calls in the
Popkin database and never carries media.

![C4 container view for starting or joining a group call](diagrams/c4-container.png)

### Components

`VideoCallPage` reads state from `CallSession`, which drives `CallsApi`, `PopkinRealtime` and
`PeerLinks`. In the API, `CallsController` dispatches to its handlers, and a participant whose
connection drops leaves after the grace period.

![C4 component view for starting or joining a group call](diagrams/c4-component.png)

### Class structure

A `Call` owns its `CallParticipant` rows and belongs to one `PopkinSpace`. A direct call also
references one `ChatThread`. The handlers depend on the membership guard, the notifier and the
relay-credential abstraction.

![Class diagram for starting or joining a group call](diagrams/class-structure.png)

### Behaviour — start or join a group call

The browser asks for the microphone and camera before any request. A refusal shows the
permission state (L2-029 AC4). Otherwise the handler finds or creates the call, adds the
participant and announces the new count for the banner. Signalling then connects the
participant to each other participant.

![Sequence diagram for starting or joining a group call](diagrams/sequence-start-or-join.png)

### Behaviour — show the banner for a call under way

The Popkin home and the Everyone thread ask for the current call. They keep the banner count
current from `CallChanged` and remove the banner on `CallEnded` (L2-029 AC2, AC6).

![Sequence diagram for the call banner](diagrams/sequence-call-banner.png)

### Behaviour — the last person leaves and the call ends

A leave arrives from the "Leave" control or from a dropped hub connection. When the last
participant leaves, the call ends and every member's banner goes (L2-029 AC6).

![Sequence diagram for the end of a call](diagrams/sequence-call-ends.png)

### Behaviour — call one member from a direct message

"Call {first name}" in a direct message opens the same page with the member, and the session
posts the join with the direct message's thread. Only the two members of the thread may start
or join that call; anyone else receives `404 thread_not_found`. The other member sees the banner
in the direct message and joins from it.

![Sequence diagram for a direct call](diagrams/sequence-direct-call.png)
