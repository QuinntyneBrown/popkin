# Popkin detailed designs

Each folder below holds one vertically sliced feature of Popkin. A feature's `README.md` gives
its overview, its building blocks, the L2 requirements it realises (from `docs/specs/L2.md`) and
its diagrams: C4 context, container and component views, a class diagram and one sequence
diagram per behaviour. The UI each design names comes from `docs/mocks/`, the source of truth for
the screens.

## Shared architecture

Popkin is one system of five containers:

- **Popkin web app** — Angular single-page application (`frontend/projects/popkin`, with the
  `api` and `components` libraries).
- **Popkin API** — ASP.NET Core on .NET 10: controllers under `/api` and the SignalR hub
  `PopkinHub` at `/hubs/popkin` for live updates and call signalling. It runs as one instance
  ([ADR 0009](../adr/0009-one-api-instance.md)).
- **Popkin Worker** — .NET worker service for scheduled jobs. It hosts three: it wraps up the
  Popkins whose time is up, removes the photos of a Popkin wrapped up without its album, and
  prepares the zip of an album. It runs as one instance, holds no hub connection and sends no hub
  events ([ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md)).
- **Popkin database** — SQL Server through EF Core.
- **Photo store** — object storage for photo files. Provider: `<TO SUPPLY>`.

External systems: an SMS provider and an email provider deliver six-digit codes, and a media
relay (STUN/TURN) helps the browsers on a call reach each other. The SMS and email providers are
`<TO SUPPLY>`. The media relay is any TURN server that takes shared-secret credentials, and a
call is a mesh of connections between browsers that Popkin's API signals and never carries
([ADR 0014](../adr/0014-calls-are-a-mesh.md)).

The domain entity for a Popkin is `PopkinSpace`. A class named `Popkin` would collide with the
root namespace `Popkin`. Every other entity carries its spec term: `Person`, `Membership`,
`ChatThread`, `Message`, `Call`, `Photo`, `Experience`.

A person who is not a member of a Popkin receives `404` with code `popkin_not_found` for
anything in it, so a Popkin's existence is never disclosed (L2-051).

Every Popkin has its own address, `https://{address}.popkin.community` (L1-016). The same web app
answers on the apex, `popkin.community`, and on every address host, and the proxy forwards `/api`
and `/hubs` on every host, so each host is one origin
([Open a Popkin by its address](popkins/open-by-address/README.md),
[Address safety](security/address-safety/README.md)). The designs write the routes inside a
Popkin as `/p/:popkinId/...`; on an address host each is served at the same path without that
prefix (`/p/:popkinId/chat` is `/chat` on `lakeside-weekend.popkin.community`). The apex keeps
only `/p/:popkinId/created`.

Shared names used across the designs:

- `IMembershipGuard` (`RequireMemberAsync`, `RequireActiveMemberAsync`, `RequireHostAsync`) is
  defined in [Membership authorisation](security/membership-authorisation/README.md).
- ProblemDetails codes shared by every write: `404` `popkin_not_found`, `403` `host_only`, `409`
  `popkin_wrapped_up`, `429` `rate_limited`. What only a wrapped-up Popkin has, its recap, its
  album export and its crew, answers `409` `popkin_active` for a Popkin that has not wrapped up.
- No HTTP interceptor of the web app reacts to `409` `popkin_wrapped_up`. The screen that was
  refused answers for itself, the thread by closing its composer and a dialog with its general
  failure, and `WrapUpWatch` moves the member to the recap
  ([Read-only Popkin](wrap-up/read-only-popkin/README.md),
  [ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md)).
- Rate-limiter policy names live in `RateLimitPolicyNames`
  ([Abuse limits](security/abuse-limits/README.md)).
- The session cookie is `__Host-popkin`, `Secure`, `HttpOnly` and `SameSite=Strict`, as built in
  journey 1 ([Sessions](accounts/sessions/README.md), L2-007 AC4). Addresses change it to
  `__Secure-popkin` with `Domain` set to the base domain, so one session serves every address
  ([Address safety](security/address-safety/README.md), L2-067 AC3).
- Addresses, invite links and Popkin links are built by `PopkinUrlBuilder` from the configuration
  section `Addresses` (`BaseDomain`, `Reserved`), which replaces `Invites:BaseUrl`
  ([Choose the address](popkins/choose-address/README.md)).
- Routes follow the mock manifest. A direct message is `/p/:popkinId/chat/:memberId` and the
  welcome screen is `/i/:code/welcome`.

## Shared real-time rules

Every design that sends or receives through `PopkinHub` keeps these rules. They come from the
audit [Learnings from BombRMan](../audits/learnings-from-bombrman.md), improvements 1 to 7.

- **The hub is a transport.** A hub method checks nothing itself and sends one MediatR request,
  exactly as a controller does. Membership and participant checks have one home,
  `IMembershipGuard`, and are tested the same way for HTTP and for the hub.
- **The contract is typed on both sides.** The hub is `Hub<IPopkinClient>`, with one interface
  method per event and DTOs from `Popkin.Application`, so the compiler checks every send. In the
  `api` library the event names live in one typed map that `SignalRPopkinRealtime` alone reads.
- **Event names are PascalCase**, the name of the `IPopkinClient` method: `MessageAdded`,
  `PopkinWrappedUp`.
- **An event is a hint that the state changed, never the only way to learn it.** Each design
  that adds an event names the read that recovers it, and `PopkinRealtime.reconnected$` triggers
  that read. The table of events and recovery reads is in
  [Live messages](chat/live-messages/README.md#events-and-their-recovery-reads).
- **Only the API sends events.** The Worker holds no connection and sends none
  ([ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md)): what it does at a time every
  client knows, wrapping up a Popkin whose time is up, an open screen learns from its own clock
  check and the event's recovery read.
- **Every event is one of two kinds.** A **state event** carries the full current value and a
  version that only rises (a counter on the aggregate); the client keeps the highest version it
  has seen for that aggregate and drops anything older. A **fact event** is final and idempotent:
  applying it twice, or before the fact it refers to arrives, ends in the same state.
- **State may be coalesced; an edge never is.** "The microphone is now off" replaces the state
  before it. A message, a WebRTC `offer`, `answer` or ICE `candidate` must each arrive: none is
  coalesced, deduplicated by content or dropped under load. When a limit is hit, the action
  fails visibly.
- **Sends are awaited** in the request that causes them, and every send names a group or users;
  nothing is sent to all connections (L2-051). `PresenceChanged` alone is not awaited: a
  connection or the end of a grace period causes it, `PresenceBroadcaster` sends it, and its
  version lets a client drop a late one.
- **A connection that has just started is not yet in its groups**: SignalR answers the handshake
  before `OnConnectedAsync` has finished. `reconnected$` therefore fires after every start, the
  first included, and the screens read again.
- **Hub failures use the ProblemDetails `code` values**, so the client branches on one
  vocabulary, and detailed hub errors are on in Development only (L2-052 AC5).
- **The client is `@microsoft/signalr` from npm**, in `frontend/package.json`, on the release
  line of the server's ASP.NET Core and updated with it. Nothing is vendored.
- **Tests**: the hub is stubbed in Playwright and reached in memory by the API tests
  ([ADR 0010](../adr/0010-the-hub-in-tests.md)); the stores' rules have unit tests
  ([ADR 0011](../adr/0011-unit-tests-for-frontend-logic.md)).

## Measurements

A design that states a number names the instrument that shows it
([ADR 0012](../adr/0012-opentelemetry.md)). Popkin's own instruments are on the meter `Popkin`:

| Requirement | Promise | Instrument | Design |
|---|---|---|---|
| L2-055 AC3 | 95 % of reads within 300 ms, 99 % within 1 s | `http.server.request.duration` (ASP.NET Core), by route template | [Fast screens](reliability/fast-screens/README.md) |
| L2-027 AC1 | A message arrives within 1 s | `popkin.hub.send.duration`, from the commit to the end of the hub send, by event | [Live messages](chat/live-messages/README.md) |
| L2-044 AC1 | A Popkin wraps up within 1 minute of its end | `popkin.wrap_up.lateness`, now minus `EndsAt` at wrap-up | [Time is up](wrap-up/time-is-up/README.md) |
| L2-053 | Limits hold | `popkin.rate_limit.rejections`, by policy | [Abuse limits](security/abuse-limits/README.md) |
| L2-003 | A code arrives | `popkin.codes.send_failures`, by channel | [Sign up](accounts/sign-up/README.md) |

A dimension is always one of a fixed set of values; an id, an address or anything a person typed
is never one (L2-054 AC3).

Built so far: `popkin.hub.send.duration` and, beside it, `popkin.hub.send.failures`, both by
event name, and, with journey 9, `popkin.wrap_up.lateness` and the Worker's heartbeat
`popkin.wrap_up.last_tick`, the time its last wrap-up tick finished (`PopkinMetrics`). The
other instruments of the table, and the exporter set-up of ADR 0012, are not built, so nothing
is exported yet. Calls have no instrument of their own: nothing counts the calls started, the
people on them or the signals refused (known gap 33). Experiences added none either, and
neither did the recap, the album exports, the crew invites, the Chat tab or direct messages;
the events of a direct message are measured by `popkin.hub.send.duration` with those of
Everyone, by event name.

## Conflicts between the mocks and the specs

Each design follows the source named below and marks the conflict in its own README.

- The reactions dialog showed six quick reactions, while L2-024 asks for five
  ([React to a message](chat/react-to-message/README.md)). Settled before journey 12 in favour
  of the requirement: five (❤️ 😂 😍 🔥 👏), with 🥞 among the twelve of "More reactions"; the
  mocks were redrawn (`reactions/default.html`, `mine.html` and `more.html`).
- The score bars scale to the largest count, while L2-038 AC2 asks for each value's share
  ([View an experience](experiences/view-experience/README.md)). The design follows the mock, and
  journey 8 built it so: each bar is drawn against the largest count, and the count beside it
  says the share exactly.
- The album thumbnails carry empty `alt` text, while L2-032 AC7 names the text
  ([Browse the album](photos/browse-album/README.md)). The design follows the requirement.
- The invite dialog and the created screen show the short link `popk.in/lakeside`,
  while L2-065 builds the link on the Popkin's address and L2-011 AC5 no longer allows a code the
  Host chose ([Invite people](invitations/invite-people/README.md),
  [Join by code](invitations/join-by-code/README.md)). The design follows the requirement; the
  mocks need the new link. "Got a code?" no longer names it (journey 15).
- L2-064 AC7 asks for the not-found screen at a host more than one label deep
  (`a.b.popkin.community`), while a wildcard certificate covers one label only, so the browser
  refuses the connection before any screen loads, and L2-067 AC5 refuses such a host with `400`
  ([Address safety](security/address-safety/README.md)). The design follows L2-067 AC5; whether a
  certificate for deeper hosts is wanted is open (known gap 19).
- L2-002 AC4 shows "Sign in" from 640 px, while the design system's responsive page said
  576 px ([Responsive layout](accessibility/responsive-layout/README.md)). The design follows
  the requirement, and journey 10 settled it: the design system was corrected to 640 px, and
  the landing page shows "Sign in" in its navigation from there
  ([View the landing page](landing/view-landing-page/README.md)).
- The banner of the last hour draws the Host's action as "Change", while L2-044 AC2 names it
  "Change how long it lasts" ([Time is up](wrap-up/time-is-up/README.md)). Journey 9 built the
  mock: the button reads "Change" and its accessible name is "Change" too. Journey 16 gave it
  both: it still reads "Change", and its accessible name is "Change how long it lasts", which
  contains the visible label (WCAG 2.5.3; known gap 47).

## Subsystems and features

| Subsystem | Feature | L2 requirements |
|-----------|---------|-----------------|
| Landing | [View the landing page](landing/view-landing-page/README.md) | L2-001, L2-002, L2-061 |
| Landing | [Marketing site](landing/marketing-site/README.md) | L2-079, L2-080, L2-081, L2-061 |
| Accounts | [Sign up](accounts/sign-up/README.md) | L2-003 |
| Accounts | [Confirm the code](accounts/confirm-code/README.md) | L2-004, L2-005 |
| Accounts | [Sign in](accounts/sign-in/README.md) | L2-006 |
| Accounts | [Sessions](accounts/sessions/README.md) | L2-007, L2-050 |
| Accounts | [Manage the account](accounts/manage-account/README.md) | L2-048 |
| Accounts | [Delete the account](accounts/delete-account/README.md) | L2-049 |
| Popkins | [Start a Popkin](popkins/start-popkin/README.md) | L2-008, L2-009, L2-010, L2-062, L2-065 |
| Popkins | [Choose the address](popkins/choose-address/README.md) | L2-062, L2-063, L2-067 |
| Popkins | [Open a Popkin by its address](popkins/open-by-address/README.md) | L2-064 |
| Popkins | [My Popkins](popkins/my-popkins/README.md) | L2-017, L2-018, L2-064 |
| Popkins | [Popkin home](popkins/popkin-home/README.md) | L2-019 |
| Popkins | [Popkin settings](popkins/popkin-settings/README.md) | L2-020, L2-066 |
| Popkins | [Leave a Popkin](popkins/leave-popkin/README.md) | L2-047 |
| Invitations | [Invite people](invitations/invite-people/README.md) | L2-011, L2-065 |
| Invitations | [Preview an invite](invitations/preview-invite/README.md) | L2-012, L2-016, L2-065 |
| Invitations | [Join a Popkin](invitations/join-popkin/README.md) | L2-013, L2-014 |
| Invitations | [Join by code](invitations/join-by-code/README.md) | L2-015, L2-065 |
| Chat | [Send a message to everyone](chat/send-message-to-everyone/README.md) | L2-021 |
| Chat | [Conversations](chat/conversations/README.md) | L2-022 |
| Chat | [Direct messages](chat/direct-messages/README.md) | L2-023 |
| Chat | [React to a message](chat/react-to-message/README.md) | L2-024 |
| Chat | [Reply to a message](chat/reply-to-message/README.md) | L2-025 |
| Chat | [Send photos in chat](chat/send-photos-in-chat/README.md) | L2-026 |
| Chat | [Live messages](chat/live-messages/README.md) | L2-027 |
| Chat | [Failed messages](chat/failed-messages/README.md) | L2-028 |
| Calls | [Group call](calls/group-call/README.md) | L2-029 |
| Calls | [Call controls](calls/call-controls/README.md) | L2-030 |
| Photos | [Add photos](photos/add-photos/README.md) | L2-031 |
| Photos | [Browse the album](photos/browse-album/README.md) | L2-032 |
| Photos | [View a photo](photos/view-photo/README.md) | L2-033 |
| Photos | [React to a photo](photos/react-to-photo/README.md) | L2-034 |
| Photos | [Comment on a photo](photos/comment-on-photo/README.md) | L2-035 |
| Photos | [Save a photo](photos/save-photo/README.md) | L2-036 |
| Experiences | [List experiences](experiences/list-experiences/README.md) | L2-037 |
| Experiences | [View an experience](experiences/view-experience/README.md) | L2-038 |
| Experiences | [Rate an experience](experiences/rate-experience/README.md) | L2-039 |
| Experiences | [Share an experience](experiences/share-experience/README.md) | L2-040 |
| Experiences | [Comment on an experience](experiences/comment-on-experience/README.md) | L2-041 |
| Experiences | [Say you are keen](experiences/say-keen/README.md) | L2-042 |
| Wrap up | [The Host wraps up](wrap-up/host-wraps-up/README.md) | L2-043 |
| Wrap up | [Time is up](wrap-up/time-is-up/README.md) | L2-044 |
| Wrap up | [Read-only Popkin](wrap-up/read-only-popkin/README.md) | L2-045 |
| Wrap up | [Recap](wrap-up/recap/README.md) | L2-046 |
| Security | [Membership authorisation](security/membership-authorisation/README.md) | L2-051 |
| Security | [Input validation and encoding](security/input-validation-and-encoding/README.md) | L2-052 |
| Security | [Abuse limits](security/abuse-limits/README.md) | L2-053 |
| Security | [Personal data protection](security/personal-data-protection/README.md) | L2-054 |
| Security | [Address safety](security/address-safety/README.md) | L2-067 |
| Reliability | [Fast screens](reliability/fast-screens/README.md) | L2-055 |
| Reliability | [Loading, failure and offline](reliability/loading-failure-offline/README.md) | L2-056 |
| Accessibility | [WCAG 2.2 AA](accessibility/wcag-2-2-aa/README.md) | L2-057 |
| Accessibility | [Responsive layout](accessibility/responsive-layout/README.md) | L2-058 |
| Accessibility | [Light and dark themes](accessibility/light-and-dark-themes/README.md) | L2-059 |
| Accessibility | [Optional motion](accessibility/optional-motion/README.md) | L2-060 |

Every L2 requirement from L2-001 to L2-067 is realised by at least one feature above.

## Known gaps

The designs mark what is not decided with `<TO SUPPLY>`. Most markers are copy or a value. The
ones below are decisions that shape the architecture; a journey cannot be finished, and some
cannot start, until its row is settled. When a gap is settled, its row stays and names the ADR
or design that settled it.

| # | Open decision | Blocks | Settled by |
|---|---|---|---|
| 1 | SMS provider and email provider for the six-digit codes ([Sign up](accounts/sign-up/README.md)) | First deployment; journeys 1, 2 and 6 outside Development; the crew invites of journey 9, which are accepted and send nothing until a provider is chosen ([Recap](wrap-up/recap/README.md)) | |
| 2 | Where `Auth:CodeHashKey` is stored and how it is rotated ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 3 | Reverse proxy product in front of the API ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 4 | Where the images run, where they are pushed and how a release is rolled back ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 5 | Hosting of SQL Server and key management for encryption at rest ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 6 | Telemetry backend, log retention and alert thresholds ([ADR 0012](../adr/0012-opentelemetry.md)) | First deployment | |
| 7 | Load target: concurrent connections and "normal load" ([Fast screens](reliability/fast-screens/README.md), [Live messages](chat/live-messages/README.md)) | Nothing yet; ends [ADR 0009](../adr/0009-one-api-instance.md) when it passes one instance | |
| 8 | Whether closing a person's open hub connections at sign-out is needed ([Live messages](chat/live-messages/README.md)) | Sign out (journey 17). Journey 3 was built without it: there is no sign-out yet, and nothing closes a connection | Journey 17: the web app stops its own connection when it signs out or deletes the account; closing the other connections of a revoked session on the server stays open ([Manage the account](accounts/manage-account/README.md)) |
| 9 | Photo store provider and the management of its keys ([Add photos](photos/add-photos/README.md)) | First deployment with profile photos (journey 2) or with the album: journey 5 is built, and outside Development no photo can be added, because there is no photo store there; journeys 13 and 14 outside Development. The album's zip of journey 9 is written to the same store, so outside Development an album export fails too | The contract and the address scheme are settled by [Join a Popkin](invitations/join-popkin/README.md): `IPhotoStore`, with addresses the API signs and serves for one hour. The provider behind it stays open |
| 10 | Media topology for calls, mesh or SFU, and where an SFU would run ([Group call](calls/group-call/README.md)) | Journey 7 | [ADR 0014](../adr/0014-calls-are-a-mesh.md): a mesh, signalled through the hub; no SFU runs |
| 11 | Media relay (STUN/TURN) provider and credential lifetime ([Group call](calls/group-call/README.md)) | Journey 7 | [ADR 0014](../adr/0014-calls-are-a-mesh.md) and [`docs/deployment.md`](../deployment.md): any TURN server that takes shared-secret (TURN REST) credentials, through the `MediaRelay` settings; one hour unless set. Which relay a deployment runs stays its own choice |
| 12 | How the other member learns of a direct call ([Group call](calls/group-call/README.md)). Journey 11 built the direct call with a banner only: "Call · {n} on the call" with "Join" in the direct message. Nothing rings and nothing is notified, so a member who is not on that direct message's screen learns nothing of the call; whether a direct call rings or notifies is still open, and no mock draws an incoming call | Journey 11 for the banner; ringing and notification need a requirement and a mock first | In part, by journey 11: the banner in the direct message. Ringing and notification stay open |
| 13 | How a hub event sent by the Worker reaches clients: a backplane, or another path ([Time is up](wrap-up/time-is-up/README.md), [ADR 0009](../adr/0009-one-api-instance.md)) | Journey 9 | [ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md): no backplane and no other path; the Worker sends no hub events. `WrapUpWatch` in the web app reads the Popkin every 30 seconds once its end has passed, and opens the recap when it reads as wrapped up. A wrap-up by the Host is still sent over the hub, by the API |
| 14 | Number of Worker instances ([Time is up](wrap-up/time-is-up/README.md)) | Journey 9 | [ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md) and [`docs/deployment.md`](../deployment.md): one. The version counter on a Popkin keeps a second instance from wrapping it up twice; nothing keeps two instances from preparing one album export twice |
| 15 | Whether field measurement of screen speed is wanted, and its collector ([Fast screens](reliability/fast-screens/README.md)) | Nothing | |
| 16 | One command that starts the API, the Worker and the app (an AppHost, by ADR). The Worker hosts its jobs since journey 9, and three terminals start the three: `eng/Start-E2eApi.ps1`, `eng/Start-E2eWorker.ps1` and `npm start` | Nothing; wanted now that a wrap-up by time and "Save the album" need the Worker running | |
| 17 | DNS provider, wildcard certificate authority and renewal for `*.popkin.community` ([Address safety](security/address-safety/README.md)) | First deployment with addresses; L2-067 AC1 | |
| 18 | How each web app build sets `BASE_DOMAIN`, and whether development needs one session across `*.localhost` ([Open a Popkin by its address](popkins/open-by-address/README.md), [Address safety](security/address-safety/README.md)) | Building addresses (journey 1 rework) | |
| 19 | Whether a host more than one label deep should reach the not-found screen, which needs a certificate beyond the wildcard (L2-064 AC7 against L2-067 AC5) | Nothing | |
| 20 | Mocks for the address field, the not-here screen, the address on the created screen and in Edit name and look, and the invite link on the address ([Choose the address](popkins/choose-address/README.md)) | Building addresses | |
| 21 | Whether the photo view gains a visible previous and next control. It has none, as the mock draws none, so a member who uses a pointer and cannot swipe cannot move between photos (WCAG 2.5.1, L2-057) ([View a photo](photos/view-photo/README.md)) | Nothing built; L2-057 for the photo view | |
| 22 | Whether "Save photo" must save the photo at the size it was added (L2-036 AC1). The file a member chooses is not kept: the stored display image is at most 2048 px on its longest edge, and that is what would be saved ([Add photos](photos/add-photos/README.md), [Save a photo](photos/save-photo/README.md)) | Journey 14 || Journey 14: each upload keeps an original-size copy without location or device data (`Photo.OriginalKey`), and "Save photo" downloads it; a photo stored before journey 14 is saved at its display size ([Save a photo](photos/save-photo/README.md)) |
| 23 | Whether starting a Popkin adds the connections its creator already holds to the new Popkin's hub group. `CreatePopkinCommandHandler` does not, so a person who starts a Popkin in one tab gets no event for it in another until the hub reconnects ([My Popkins](popkins/my-popkins/README.md), [Live messages](chat/live-messages/README.md)) | Nothing; found in journey 6 | |
| 24 | How the app opens without a connection, and whether every screen keeps a saved answer. There is no service worker, so the app does not open offline from cold, and only My Popkins keeps a saved list; the `ResponseCache`, `screenLoad()` and `httpErrorInterceptor` of the design are not built ([Loading, failure and offline](reliability/loading-failure-offline/README.md)) | L2-056 AC4 for every screen but My Popkins | |
| 25 | Clearing the saved list of My Popkins at sign out and at account deletion (L2-054). Only a 401 clears it today ([My Popkins](popkins/my-popkins/README.md)) | Journeys 17 and 19 | Journeys 17 and 19: sign out and deleting the account clear it ([Manage the account](accounts/manage-account/README.md), [Delete the account](accounts/delete-account/README.md)) |
| 26 | Screens My Popkins and the scanner link to that were not built: Join with a code (`/join`, journey 15) and the account (`/account`, journey 17). Each link reached the not-found screen until its journey. The recap (`/p/:popkinId/recap`) was the third, and journey 9 built it. Since journey 10, "Join with a code" on the welcome screen links to `/join` too ([View the landing page](landing/view-landing-page/README.md)) | Journeys 15 and 17 | The recap: [Recap](wrap-up/recap/README.md). The account: journey 17 ([Manage the account](accounts/manage-account/README.md)). Join with a code: journey 15 built it ([Join by code](invitations/join-by-code/README.md)). Closed |
| 27 | Whether a cap on who may join a call is wanted. There is none: the limit of 12 tiles is a limit of what is shown, and a mesh serves a large call badly, each browser sending its picture once per other person. A cap needs a requirement first; an SFU needs its own record ([ADR 0014](../adr/0014-calls-are-a-mesh.md), [Group call](calls/group-call/README.md)) | None; found in journey 7 | |
| 28 | A participant who posted the join and never called `JoinCall`, because the tab closed in between, is not taken off the call. They have no connection on it, so no dropped connection starts their grace, and a call they are the last on never ends ([Group call](calls/group-call/README.md)) | None; found in journey 7 | Journey 7: a join starts the same 20-second grace as a dropped connection, and `JoinCall` within it keeps the participant on the call |
| 29 | A failed `PATCH` of the microphone or camera is not shown and is not made again until the member's next change. The device sends nothing it should not, but the others see the earlier state until then ([Call controls](calls/call-controls/README.md)) | None; found in journey 7 | |
| 30 | What happens to a call under way when its Popkin wraps up ([Group call](calls/group-call/README.md), [Read-only Popkin](wrap-up/read-only-popkin/README.md)) | Journey 9 | Journey 9, [The Host wraps up](wrap-up/host-wraps-up/README.md): the wrap-up ends it in the same unit of work, by its Host or by its time. Every participant is taken off it, `CallEnded` is sent before `PopkinWrappedUp`, and a change of microphone or camera afterwards answers `409` `popkin_wrapped_up`. A wrap-up by time ends the call in the database and sends neither event, because the Worker sends none (ADR 0015) |
| 31 | A member on a call from two devices. The same membership has one participant row, so the second device's join adds nothing; its `JoinCall` then takes the call's events and signals from the first device, which is told nothing ([Group call](calls/group-call/README.md)) | None; found in journey 7 | |
| 32 | No media relay was exercised by any test. Calls were checked by hand between two browsers on one machine, which connect directly; the credentials are proved by their signature only ([ADR 0014](../adr/0014-calls-are-a-mesh.md), [`docs/deployment.md`](../deployment.md)) | First deployment with calls on the public internet | |
| 33 | Calls have no instrument on the `Popkin` meter, and a refused signal is not counted by `popkin.rate_limit.rejections`, which is not built ([ADR 0012](../adr/0012-opentelemetry.md), [Abuse limits](security/abuse-limits/README.md)) | None | |
| 34 | The diagrams of [Group call](calls/group-call/README.md) and [Call controls](calls/call-controls/README.md) were not redrawn after journey 7, nor after journey 11. They show `CALL_SESSION` and `WebRtcCallSession`, a `Kind` on the call, events without the Popkin's id or the thread's, and a direct call opened at `/p/{popkinId}/call?thread=`, where journey 11 built `/p/{popkinId}/chat/{memberId}/call`; each design says so above its diagrams | None | |
| 35 | Alone on a call on a phone shorter than about 980 px, "Invite to call" under "Waiting for the others" starts beneath the controls and shows only after scrolling. The mock (`video-call/empty.html`) draws it so: the tile and the message each keep the call's minimum height. "Invite to call" in the top bar is always in view ([Group call](calls/group-call/README.md)); found in journey 7 | None | |
| 36 | "Share one" was still offered in a wrapped-up Popkin, and the dialog showed the API's `409` `popkin_wrapped_up` as the general failure ([Share an experience](experiences/share-experience/README.md), [Read-only Popkin](wrap-up/read-only-popkin/README.md)) | Journey 9 | Journey 9, [Read-only Popkin](wrap-up/read-only-popkin/README.md): Experiences of a wrapped-up Popkin offers no "Share one", in its header, floating or in its empty states, and an experience offers no rating, no comment and no actions. A member who shares in the moment the Popkin wraps up still sees the general failure, then is moved to the recap |
| 37 | An experience edited from "Something we did" or "Restaurant" to "Want to do" keeps its ratings and comments, hidden: it has no score and no rating panel, and they show again if it is edited back. Whether the edit should be refused, or the ratings removed, is not decided ([Share an experience](experiences/share-experience/README.md), [Rate an experience](experiences/rate-experience/README.md)) | None; found in journey 8. Journey 20 decides the same for "We did this" | |
| 38 | The list of experiences, the score and the comments do not update live. Nothing about an experience is sent over the hub, so another member sees a share, a rating, a comment, an edit or a delete when they next open the screen. L2-037 to L2-041 ask for nothing more ([List experiences](experiences/list-experiences/README.md), [View an experience](experiences/view-experience/README.md)) | None | |
| 39 | The list of experiences has no paging: one answer carries every experience of the Popkin, and the home's summary reads them all to rank them ([List experiences](experiences/list-experiences/README.md)) | None; a Popkin with hundreds of experiences | |
| 40 | The seeder adds no experiences, so a seeded Popkin opens on "Nothing shared yet" ([List experiences](experiences/list-experiences/README.md)) | None | |
| 41 | A HEIC picture has no preview in the Share an experience dialog in a browser that cannot draw HEIC. The picture is still sent, and is stored as a JPEG ([Share an experience](experiences/share-experience/README.md)) | None; found in journey 8 | |
| 42 | Keen and "We did this" are not built. A "Want to do" card reads "0 keen", and its page shows the experience with no keen panel; there is no `ExperienceKeen` and no `CanMarkDone` ([Say you are keen](experiences/say-keen/README.md)) | Journey 20 | |
| 43 | How a member comments on a "Want to do" experience. `docs/mocks/pages/experience-detail/want.html` draws comments without stars, and a comment belongs to a rating, which such an experience does not have. Nothing is built: the page lists none and the API answers `409` `rating_required` ([Comment on an experience](experiences/comment-on-experience/README.md), [Say you are keen](experiences/say-keen/README.md)) | Journey 20 | |
| 44 | The diagrams of the five built designs of Experiences were not redrawn after journey 8. They show validator classes, `ExperienceKeen`, kind `WantToDo`, a `Photo` row for the picture, bars computed by the API and pages that hold the logic the stores now hold; each design says so above its diagrams | None | |
| 45 | Experience cards in one row have pictures of different heights between 640 px and the widest layouts (168 and 224 px at 1024 px), and a long byline is cut ("Mara · Sat mo…"). The mock (`experiences/default.html`) draws both, and the app matches it: the mock changes first ([List experiences](experiences/list-experiences/README.md)); found in journey 8 | None | |
| 46 | Choosing a picture in Share an experience on a phone scrolls the dialog's heading and the "Title" label out of view, as the dialog grows taller than the screen ([Share an experience](experiences/share-experience/README.md)); found in journey 8 | None | |
| 47 | The Host's "Change" on the banner of the last hour. L2-044 AC2 asks for "Change how long it lasts", which is not built: the button opens Popkin settings, where that dialog will be, and the menu does not offer it yet. The banner offers "Change" on the Popkin home only, not on the Everyone thread, Photos or Experiences, where the banner also shows; and its accessible name is "Change", not "Change how long it lasts" ([Time is up](wrap-up/time-is-up/README.md), [Popkin settings](popkins/popkin-settings/README.md)) | Journey 16; L2-044 AC2 || Journey 16, [Popkin settings](popkins/popkin-settings/README.md): on the Popkin home the Host's "Change" opens "Change how long it lasts", and `pk-banner`'s `actionLabel` names it "Change how long it lasts". Still open: the Everyone thread, Photos and Experiences show the banner without "Change" |
| 48 | `dotnet format --verify-no-changes` reports whitespace in three files of `Popkin.Domain`: `Experience.cs`, `Membership.cs` and `Photo.cs`. They predate journey 9, which left them as they were | None; a formatting change of its own | |
| 49 | The local API, on SQLite, stores a time to about 100 µs, because `AppDbContext` converts every `DateTimeOffset` to a sortable number there (`DateTimeOffsetToBinaryConverter`). A time read back can differ from the one written by less than that; SQL Server and the tests' InMemory provider keep it whole. Found in journey 9, which compares `EndsAt`, `WrappedUpAt` and `ExpiresAt` with the clock | None; local runs and recordings only | |
| 50 | A timed wrap-up reaches an open screen late. The Worker wraps the Popkin up within a minute of its end, on a tick of 30 seconds, and the web app's clock check reads within 30 seconds after that: about a minute and a half after the end; 90 seconds, measured by hand. L2-044 AC4 asks for no reload and names no time. A device whose clock is behind is late by as much more ([ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md), [Time is up](wrap-up/time-is-up/README.md)) | None; a tighter time needs a record that supersedes ADR 0015 | |
| 51 | A crew invite is delivered to nobody. In Development the sender writes one log line and sends nothing; outside Development no provider is configured, so nothing is sent and nothing is recorded as sent. The request is accepted with `202` either way, and the Host reads "Invites are on their way" ([Recap](wrap-up/recap/README.md)) | First deployment; with gap 1 | |
| 52 | A wrapped-up Popkin cannot be left, and nothing says whether it should be: Popkin settings opens from the home, and the home of a wrapped-up Popkin opens its recap ([Read-only Popkin](wrap-up/read-only-popkin/README.md), [Leave a Popkin](popkins/leave-popkin/README.md)) | Journey 18 | |
| 53 | The diagrams of the four designs of Wrap up and of [Popkin settings](popkins/popkin-settings/README.md) were not redrawn after journey 9. They show `CurrentPopkinStore`, `TimeLeftClock`, `activePopkinGuard` and `wrappedUpInterceptor`, a backplane between the Worker and the hub, validator and exception classes, `album_not_kept`, and a settings menu of four rows; each design says so above its diagrams | None | |
| 54 | Safety, Privacy and Help in the landing page's footer link to `/safety`, `/privacy` and `/help`, which have no screen, no requirement and no mock. Each shows the not-found screen ([View the landing page](landing/view-landing-page/README.md)) | First deployment: a public page that links to nothing; each needs a requirement and a mock first | |
| 55 | Whether `/welcome`, `/sign-up` and `/sign-in` also send a signed-in person to My Popkins. L2-002 AC3 asks it of the landing address only, and `signedOutGuard` is on that route only: a signed-in person who opens the welcome screen sees it ([View the landing page](landing/view-landing-page/README.md), [Sessions](accounts/sessions/README.md)) | None; found in journey 10. Sign out (journey 17) opens the welcome screen | |
| 56 | `pk-qr` has no parity spec, against [ADR 0008](../adr/0008-component-parity-specs.md), which asks one of every component. The mock draws a sample code and the app the real one, so the two never match; for the same reason the hero's parity compares the whole hero at 360 px, where the code does not show, and only its text and the preview's name at 1280 px. The code is left to the sweep ([View the landing page](landing/view-landing-page/README.md)) | None; a parity spec needs a mock that draws the real code of its link | |
| 57 | Three oddities of the landing mock (`landing/default.html`) were reproduced, not fixed: the length line of an idea ("Keeps going") is drawn muted; the comparison's column headings have no hairline under them; and from 576 px the preview's QR card overlaps the first message. The app matches the mock: the mock changes first ([View the landing page](landing/view-landing-page/README.md)); found in journey 10 | None | |
| 58 | The diagrams of [View the landing page](landing/view-landing-page/README.md) were not redrawn after journey 10. They show `pk-site-navigation`, `IdeaView` and `ComparisonRowView`, and a jump that the fragment alone starts; the design says so above its diagrams | None | |
| 59 | Whether database backups keep the data a deleted account had erased, and for how long. L2-049 AC4 erases it from the database within 30 days; no requirement speaks of backups ([Delete the account](accounts/delete-account/README.md)) | First deployment | |
| 60 | A new name or photo, and "Former member" after a deletion, reach the other members on their next read. No `MemberUpdated` event is sent over the hub; L2-048 AC2 asks only that it shows wherever the person appears ([Manage the account](accounts/manage-account/README.md)) | None; found in journey 17 | |
| 61 | The Everyone card of the Chat tab can read "No messages yet" beside an unread count of 1. The count is of every message by others after the read point, the notes Popkin writes ("Joel popped in") included (L2-027 AC3), while the card's latest line leaves those notes out. Which of the two should change is not decided ([Conversations](chat/conversations/README.md), [Live messages](chat/live-messages/README.md)) | None; found in journey 11 | |
| 62 | The loading and error mocks of the Chat tab (`conversations/loading.html`, `error.html`) draw no thread beside the list from 1024 px, while L2-058 AC11 asks for the group's thread there when none is chosen. The app follows the mocks: the mock changes first, or the requirement says the states without a list are exempt ([Conversations](chat/conversations/README.md)) | None; found in journey 11 | |
| 63 | "New message" stays in a wrapped-up Popkin: the read-only mock's list pane (`direct-message/read-only.html`) draws it, and the app follows it, but the API refuses to start a direct message there (`409` `popkin_wrapped_up`). Choosing a member with whom there is none yet ends on "We couldn't load this chat", with a "Try again" that fails again ([Direct messages](chat/direct-messages/README.md), [Read-only Popkin](wrap-up/read-only-popkin/README.md)) | None; found in journey 11 | |
| 64 | Photos inside a direct message (L2-023 AC3) are not built: they come with journey 13, which builds them for Everyone. Until then "Shared between you" in the person pane of a direct message lists nothing. Reactions and replies were built there in journey 12 ([Direct messages](chat/direct-messages/README.md)) | Journey 13; L2-023 AC3 | In part, by the design of journey 13 ([Send photos in chat](chat/send-photos-in-chat/README.md)): a photo sent in a direct message is readable only by its two members, never joins the album, and opens in the photo view with no previous or next (`photo-view/direct.html`). What "Shared between you" lists, and whether its thumbnails open the photo view, stays open: the mock draws three plain thumbnails |
| 65 | A direct message whose other member has left the Popkin. As a stopgap until the design of leaving (L2-047), its events reach only the member still in, it is neither listed on the Chat tab nor counted in any unread count, and it cannot be opened, since `PUT …/threads/direct/{memberId}` answers `404` `member_not_found` for a member who has left. What it should show, and the `code` of a send refused then, are not decided ([Direct messages](chat/direct-messages/README.md), [Leave a Popkin](popkins/leave-popkin/README.md)) | Journey 18 | |
| 66 | A failed load of the members in New message shows as an empty list, "Nobody by that name" and "Only members of {Popkin} can be messaged here.", not as a failure with "Try again". No mock draws that state ([Conversations](chat/conversations/README.md)) | None; found in journey 11; L2-056 AC2 for the dialog | |
| 67 | A direct call keeps "Invite to call" in its top bar, which opens the Popkin's invite dialog, though only its two members can join it; `video-call/two.html`, the mock of the direct call, draws the button and also the line "12 others in Lakeside Weekend can join anytime.", where the app writes "Only you and {first name} can join this call." The mock changes first ([Group call](calls/group-call/README.md), [Call controls](calls/call-controls/README.md)) | None; found in journey 11 | |
| 68 | The diagrams of [Conversations](chat/conversations/README.md) and [Direct messages](chat/direct-messages/README.md) were not redrawn after journey 11. They show `ThreadSummaryDto`, `pk-list-row` rows, `ChatApi.openDirectThread`, `ThreadNotFoundException`, a `GET` of a thread by its id and `Photo.DirectThreadId`; each design says so above its diagrams | None | |
| 69 | The diagrams of [React to a message](chat/react-to-message/README.md) and [Reply to a message](chat/reply-to-message/README.md) were not redrawn after the decisions of journey 12. They show `ReactionDto` with `Count` and `Mine`, `ReactionView`, `addReaction` and `removeReaction`, a read `?around={messageId}` with `GetMessagesQuery.Around` and `loadUntil`, `QuoteDto.HasPhoto`, and `replyTo` and `highlighted` on the page; they draw neither "More reactions" nor the Delete message dialog. Each design says so above its diagrams | None | |
| 70 | `ReactionsChanged(threadId, messageId, reactions)` carries no version, while the shared real-time rules ask a state event for one that only rises. Two changes to one message's reactions that commit close together can push in the other order, and a client then shows the older summary until its next change or its next window read ([React to a message](chat/react-to-message/README.md), [Live messages](chat/live-messages/README.md)) | None; found before journey 12 | Journey 12: `reactionsVersion` on the message rises with every change to its reactions; the answer of a reaction and `ReactionsChanged` carry it, and the client ignores a summary whose version is not above the one it holds. A repeat that changes nothing keeps the version and raises no event |
| 71 | Removing orphaned chat photos: a photo uploaded from the composer whose message is never sent stays in the photo store and the database, in no album and readable only through the address answered to its uploader (`GET …/photos/{photoId}` is 404 to everyone, its uploader too). It goes only when its Popkin's album is removed, not kept, after a wrap-up. After what period it is removed otherwise is not decided; a `Popkin.Worker` job is the expected home ([Send photos in chat](chat/send-photos-in-chat/README.md)) | None; found in the design of journey 13 | |
| 72 | A photo message waiting to send does not survive a reload. The outbox is saved to local storage, which cannot hold a file, so the photo of an entry not yet uploaded lives only in memory for the session; an entry already uploaded can be resent from its `photoId`. What a restored entry that lost its file shows is not decided ([Send photos in chat](chat/send-photos-in-chat/README.md), [Failed messages](chat/failed-messages/README.md)) | Journey 13 | Journey 13: the outbox saves an entry with its photo's id and without the file or its preview's address. A restored entry not yet uploaded and without its file is marked "Not sent" (failure `rejected`) before any request and can only be deleted, since "Try again" leaves it so; one uploaded before the reload is sent with its `photoId` |
| 73 | Whether a photo sent in a direct message takes the photo reactions and comments of the album (L2-033, L2-034). Decided by the design of journey 14: it does, for its two members, and a third member gets `404` on every action; `photo-view/direct.html` now draws them ([Send photos in chat](chat/send-photos-in-chat/README.md), [View a photo](photos/view-photo/README.md), [React to a photo](photos/react-to-photo/README.md), [Comment on a photo](photos/comment-on-photo/README.md)) | Journey 13 | Journey 14: a photo of a direct message takes reactions and comments for its two members; `PhotoAccess` answers `404 photo_not_found` to anyone else, on every action ([React to a photo](photos/react-to-photo/README.md), [Comment on a photo](photos/comment-on-photo/README.md)). Closed |
| 74 | What the removal of an album that was not kept (`RemovePhotosOfWrappedUpPopkinsJob`) and the erasure of a deleted account do to the photos of direct messages and to the photo of an Everyone message, whose read-only thread would then show a photo that is gone. Journey 14's design draws "Photo removed" (`group-chat/photo-removed`) and has the removal of an album set `Message.PhotoRemoved` as a photo's deletion does ([Send photos in chat](chat/send-photos-in-chat/README.md), [Save a photo](photos/save-photo/README.md), [Recap](wrap-up/recap/README.md), [Delete the account](accounts/delete-account/README.md)) | Journey 14 | In part, by journey 13: the removal of an album that was not kept removes every photo of the Popkin, those of direct messages and uploads never sent with it, and the recap goes on counting only those that were in the album. A message whose photo went reads with `photo` null, so a photo message with no text shows an empty bubble until "Photo removed" is built. The erasure of a deleted account touches no photo but the person's avatar: their chat photos stay, as their album photos do. Journey 14: the removal of an album that was not kept sets `Message.PhotoRemoved` on the messages of the photos it removes, as deleting a photo does, so they read "Photo removed" ([Save a photo](photos/save-photo/README.md)). Closed |
| 75 | Whether the photo of a message is a link rather than a button. It navigates to the photo view, `/p/{popkinId}/photos/{photoId}`, which a link does by the platform's practice (open in a new tab, the address on hover); journey 13 decided on a button, as journey 12 made quotes buttons, and the mocks drew `button.bubble__photo` ([Send photos in chat](chat/send-photos-in-chat/README.md)) | None | Journey 13: a link, `a.bubble__photo`, to the photo view, named "Open photo from {first name}"; a photo still sending has no address and is not a link (decision 4 of [Send photos in chat](chat/send-photos-in-chat/README.md)) |
| 76 | The client's own lines for a photo message with no text read its empty text, not "Photo": the reply bar (`ThreadStore.startReply`), the quote of Message actions, the line a screen reader hears when the message arrives (`announcement`), and the latest line the Chat tab (`ConversationsStore`) and My Popkins (`MyPopkinsStore`) write from `MessageAdded`, until their next read. Message actions also offers Copy for it, which copies nothing and says "Message copied.". The design asks for "Photo" in each and for no Copy; every quote and preview the server answers already reads "Photo" ([Send photos in chat](chat/send-photos-in-chat/README.md), [React to a message](chat/react-to-message/README.md), [Reply to a message](chat/reply-to-message/README.md)) | Journey 13 | Journey 13: `messageLine` reads a photo alone as "Photo" for the reply bar, the announcement, and the latest line the Chat tab and My Popkins write from `MessageAdded`; Message actions quotes it as "Photo" and offers no Copy |
| 77 | The album's zip packs the display images, at most 2048 px, not the originals that "Save photo" downloads since journey 14 (L2-046 AC4) ([Save a photo](photos/save-photo/README.md), [Recap](wrap-up/recap/README.md)) | None; found in journey 14 | |

Settled so far:

| Decision | Settled by |
|---|---|
| How many API instances run | [ADR 0009](../adr/0009-one-api-instance.md): one |
| Whether TLS ends at a reverse proxy, and who serves the web app | [ADR 0013](../adr/0013-deployment-shape.md): the proxy does both |
| The logging sink | [ADR 0012](../adr/0012-opentelemetry.md): OpenTelemetry, exported over OTLP |
| The SignalR client package | Shared real-time rules above: `@microsoft/signalr` from npm, on the server's release line |
| Reconnect delays and the disconnect grace period | [Live messages](chat/live-messages/README.md) and [Group call](calls/group-call/README.md) |
| How pure frontend logic is tested | [ADR 0011](../adr/0011-unit-tests-for-frontend-logic.md) |
| How the hub is stubbed in tests | [ADR 0010](../adr/0010-the-hub-in-tests.md) |
| The rule that ends a run of messages, the day labels and where the character count first shows | [Send a message to everyone](chat/send-message-to-everyone/README.md): the author, a day or a system note; "Today", "Yesterday", five weekdays, then the date; from 1,800 characters |
| The validation library for commands | [Send a message to everyone](chat/send-message-to-everyone/README.md): none; a handler checks and throws `ProblemException` |
| Whether a message DTO says it is the reader's own | [Send a message to everyone](chat/send-message-to-everyone/README.md): no; the client compares the author with the thread's viewer |
| The send timeout and how long "Back online" stays | [Failed messages](chat/failed-messages/README.md): 15 seconds; 5 seconds or until dismissed |
| The mock states of "New messages" and "Waiting to send" | `docs/mocks/pages/group-chat/new-messages.html` and `offline.html` |
| The limiter of the `messages` policy | [Abuse limits](security/abuse-limits/README.md): an exact sliding log per person |
| How a connection joins its Popkins' groups | [Live messages](chat/live-messages/README.md): a handler adds it from the person's memberships; no client method does |
| The `pk-*` homes of the home's header and of its chat rows | [Popkin home](popkins/popkin-home/README.md): `pk-home-header` and `pk-chat-card` |
| How many messages the home's Chat card holds | [Popkin home](popkins/popkin-home/README.md): four, of which a phone shows the three latest; system notes are left out |
| What the home shows per form factor | [Popkin home](popkins/popkin-home/README.md): the page passes the most any width shows and the stylesheets show fewer; nothing reads the viewport |
| The failure copy of the invite dialog | [Invite people](invitations/invite-people/README.md): "We couldn’t load the invite." with "Try again"; the state has no mock |
| The imaging library, HEIC, and the sizes and format of the stored photo files | [Add photos](photos/add-photos/README.md): Magick.NET, HEIC accepted; two JPEG files, a display image of at most 2048 px and a thumbnail of at most 480 px; the file chosen is not kept |
| The rate limit on photo uploads | [Abuse limits](security/abuse-limits/README.md): 60 per person per minute, refused attempts counted |
| The message when more than 20 photos are chosen, and the failed load of a later album page | [Add photos](photos/add-photos/README.md) and [Browse the album](photos/browse-album/README.md); neither state has a mock |
| Which day an album's day group follows, and in which time zone | [Browse the album](photos/browse-album/README.md): the capture day (`TakenAt`), as the member's device counts days |
| Whether previous and next follow the filter, and which time the photo view shows | [View a photo](photos/view-photo/README.md): the whole album; when the photo was added |
| Where the name step of sign in lives, and the busy label of "Send my code" | [Sign in](accounts/sign-in/README.md): a step of the code screen, `docs/mocks/pages/verify-code/name.html`; "Sending your code…" |
| From what distance a card of My Popkins says "Until {date}" | [My Popkins](popkins/my-popkins/README.md): from 7 days away; "Wrapping up" once the end has passed |
| Where the saved list of My Popkins is kept | [My Popkins](popkins/my-popkins/README.md): the browser's local storage, keyed to the person, without photo addresses |
| How many queries the list of My Popkins takes, and which threads its unread count covers | [My Popkins](popkins/my-popkins/README.md): up to ten, none per Popkin; the Everyone thread and, since journey 11, the member's direct messages whose other member has not left |
| The scanner's fallback decoding library, its design-system page and what a device with no camera is shown | [Join by scanning or typing a code](invitations/join-by-code/README.md): `jsqr`, loaded on demand; `scanner.html`; the denied state and its copy |
| Who offers a link on a call, and who gives way when both offer | [ADR 0014](../adr/0014-calls-are-a-mesh.md): the one who arrives offers; the side whose membership id sorts first gives way |
| Whether `CallSession` has a contract and a token | [Group call](calls/group-call/README.md): no; a concrete class provided in root, with its browser parts behind `CALL_MEDIA`, `PEER_LINKS` and `SPEAKING_METER` |
| What the call events carry, and how a signal is sent | [Group call](calls/group-call/README.md): `CallChanged` and `CallEnded` carry the Popkin's id; `SendSignal` is invoked, and a refused signal begins that link again once before the call fails |
| What starting or joining a call sends, and what a client does after a reconnect | [Group call](calls/group-call/README.md): `{ micOn, cameraOn }`, idempotent; it posts again and calls `JoinCall` again |
| What the call banner offers a member who is on the call | [Group call](calls/group-call/README.md): "Return"; "Join" for everyone else |
| The "+N more" wording and who has a tile above 12 people | [Call controls](calls/call-controls/README.md): 11 people, the member always, and "{n} more on the call" |
| The interval, level and hold of speaking detection | [Call controls](calls/call-controls/README.md): every 150 ms, 0.04 on a scale of 0 to 1, 600 ms; measured on the device only |
| How a minimised call is heard | [Call controls](calls/call-controls/README.md): an audio element per link that belongs to no screen; tiles play pictures without sound |
| The copy of a call that cannot be joined, the line under the list of who is on a call, and where "Leave" returns | [Group call](calls/group-call/README.md) and [Call controls](calls/call-controls/README.md): "We couldn’t connect you to the call"; "Everyone in {Popkin} is on the call." or "{n} others in {Popkin} can join anytime."; the screen the member came from, else the Popkin home |
| The limiter of call signals | [Abuse limits](security/abuse-limits/README.md): an exact sliding log of 600 a minute per hub connection |
| The kinds of an experience, and the limit on its "when" | [Share an experience](experiences/share-experience/README.md): `Did`, `Restaurant` or `Want`; at most 40 characters |
| Whether the picture of an experience is a photo of the album | [Share an experience](experiences/share-experience/README.md): no; it uses the photo store and the processing of a photo, and adds no `Photo` |
| The limits on sharing, rating and commenting | [Abuse limits](security/abuse-limits/README.md): sharing and editing under `photos`, rating and commenting under `messages`, each 60 a minute per person |
| Whether experiences update live over the hub | [List experiences](experiences/list-experiences/README.md): no; no event was added (known gap 38) |
| Where the filter of Experiences lives, and where the logic of its screens lives | [List experiences](experiences/list-experiences/README.md) and [View an experience](experiences/view-experience/README.md): in the address, `?filter=did` or `?filter=want`; in `ExperiencesStore` and `ExperienceStore` of the `api` library |
| The byline of a card without a "when", and the copy of an empty "We did" and of an unrated score card | [List experiences](experiences/list-experiences/README.md) and [View an experience](experiences/view-experience/README.md): "Idea" for "Want to do", the day it was shared otherwise; "Nothing done yet"; "Nobody has rated it yet" |
| Whether a score bar scales to the largest count or to the total, and the wording for one rating | [View an experience](experiences/view-experience/README.md): the largest count, computed in the web app; "1 rating". The mocks' averages were corrected to what their counts give: 4.7, 4.6 and 4.3 |
| How a rating that does not save is shown, and what a toast can offer | [Rate an experience](experiences/rate-experience/README.md): the stars show at once and are put back, with a danger toast offering "Try again"; a toast has one action |
| What "Undo" on "Experience shared" does | [Share an experience](experiences/share-experience/README.md): it deletes what was shared |
| Where edit and delete of an experience open, and their mocks | [Share an experience](experiences/share-experience/README.md): "Experience actions" over the picture opens a menu; edit reuses the share dialog as "Edit experience" with "Save changes"; delete asks "Delete this experience?" first. `pages/experience-detail/own.html`, `dialogs/experience-actions/`, `dialogs/delete-experience/` and `dialogs/share-experience/edit.html` |
| The `pk-*` homes of the tab header, the picture block, the comment row and "Add a picture" | [List experiences](experiences/list-experiences/README.md), [View an experience](experiences/view-experience/README.md) and [Share an experience](experiences/share-experience/README.md): `pk-tab-header`, `pk-experience-detail`, `pk-comment` in `pk-comments`, and `pk-picture-field` |
| Where "Edit your comment" is offered, the copy of a comment that does not save, and whether a comment can be cleared | [Comment on an experience](experiences/comment-on-experience/README.md): in the rating panel; "We couldn’t post that."; no |
| The tie-break of the home's highest-rated experiences | [Popkin home](popkins/popkin-home/README.md): the one more members rated, then the newer; an experience nobody has rated is not named |
| How a wrap-up by time reaches an open screen, and how many Worker instances run | [ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md): by the web app's clock check, `WrapUpWatch`, within about a minute and a half; one |
| Whether the web app has an interceptor for `409` `popkin_wrapped_up` | [Read-only Popkin](wrap-up/read-only-popkin/README.md): no; the screen that was refused answers for itself and `WrapUpWatch` moves the member |
| What a wrap-up does to the call under way, and to "Share one" | [The Host wraps up](wrap-up/host-wraps-up/README.md) and [Read-only Popkin](wrap-up/read-only-popkin/README.md): it ends the call; Experiences offers nothing to share, rate, say or change |
| How two wrap-ups at once, the Host's and the clock's, are kept apart | [The Host wraps up](wrap-up/host-wraps-up/README.md): a version counter on `PopkinSpace` that the entity raises, a concurrency token on every provider; the Host's request that loses answers `409` `popkin_wrapped_up`, and the wrap-up screen opens the recap |
| What the wrap-up screen reads before it shows, and its lede | [The Host wraps up](wrap-up/host-wraps-up/README.md): `GET /api/popkins/{popkinId}/wrap-up`, for the Host only, with the members, photos and messages the recap will count; "Every good Popkin ends. Here’s what happens next for all {n} of you." |
| The periods of the Worker's jobs and the batch of the due query | [Time is up](wrap-up/time-is-up/README.md), [Read-only Popkin](wrap-up/read-only-popkin/README.md) and [Recap](wrap-up/recap/README.md): 30 seconds, one hour and 2 seconds; 100 Popkins at a time, each saved alone |
| The banner's words under one hour, and how long a dismissal lasts | [Time is up](wrap-up/time-is-up/README.md): "1 hour left." for the first minute of the last hour, then "59 min left." and so on down to "1 min left."; until the app is loaded again, on every screen of that Popkin |
| What the recap counts, which photos and how many avatars it shows, and its top-rated moment | [Recap](wrap-up/recap/README.md): everyone who ever joined; the messages members wrote in the Everyone thread and did not delete; the photos of the album, and the number it held once it was removed; the latest three photos; at most five avatars, the Host first; the highest average, then the one more members rated, then the one shared first, with its picture |
| The album's zip: its name, its address, how long it is kept and whether one in preparation is reused | [Recap](wrap-up/recap/README.md): `{Popkin name}.zip`; a signed address that expires after an hour and downloads as an attachment; a day; yes, and so is a ready one that has not expired |
| How the crew is invited, to whom, and how once only | [Recap](wrap-up/recap/README.md): to the phone number or, without one, the email a person signs in with; the members of the old Popkin who have not left, still have an account and are not in the new one; a `CrewInvites` table records each invite sent. No contact detail, link or name is logged |
| The mocks of the wrapped-up states, and the copy chosen in the build | [Read-only Popkin](wrap-up/read-only-popkin/README.md) and [Recap](wrap-up/recap/README.md): `photo-album/wrapped.html`, `going.html` and `removed.html`, `experiences/wrapped.html`, `experience-detail/wrapped.html`, `wrapped-up/exporting.html` and `plain.html`, `popkin-home/last-hour.html` and `last-hour-member.html`; "The photos were removed", "Preparing the album…", "We couldn’t prepare the album", "Invites are on their way", "We couldn’t invite the crew" |
| What Popkin settings offers until journeys 16 and 18 | [Popkin settings](popkins/popkin-settings/README.md): "Invite people" for every member and "Wrap up" for the Host; `popkin-settings/host-now.html` and `member-now.html`. Journey 16 settled the Host's menu: `default.html`, "Edit name and look", "Change how long it lasts", "Invite people" and "Wrap up" |
| The `pk-*` homes of the landing page's blocks and of the welcome screen | [View the landing page](landing/view-landing-page/README.md): `pk-site-nav`, `pk-site-nav-link`, `pk-site-main`, `pk-site-footer`, `pk-site-footer-link`, `pk-hero`, `pk-band`, `pk-steps`, `pk-uses`, `pk-use`, `pk-compare` and `pk-cta-band`; `pk-welcome`, `pk-action-pair` and `pk-mark-picture`; `pk-qr`, taken out of `pk-qr-card` |
| How "How it works" and "Ideas" jump | [View the landing page](landing/view-landing-page/README.md): each link sets the fragment and also calls the jump, so a link chosen twice jumps twice; the heading takes focus, and the scroll is instant under reduced motion |
| From which width the landing page shows "Sign in" in its navigation, puts the hero side by side and shows four ideas across | [View the landing page](landing/view-landing-page/README.md): 640 px, the requirement, to which the design system was corrected; 992 px, the mock's CSS, which satisfies "from 1024 px" (L2-001 AC6) |
| Who the landing address sends on | [View the landing page](landing/view-landing-page/README.md): `signedOutGuard` sends a signed-in person from `/` to `/popkins`; the other public screens have no such guard (known gap 55) |
| How L2-061 AC2 is proven for the landing page | [View the landing page](landing/view-landing-page/README.md): a behaviour spec that the page requests nothing from another origin |
| What answers `/` | [View the landing page](landing/view-landing-page/README.md): the landing page; the scaffold's placeholder screen is gone, and no screen of the app is a placeholder |
| What `/p/:popkinId/chat` is, and what the Chat tab shows from 1024 px | [Conversations](chat/conversations/README.md): the Chat tab, no longer a redirect to Everyone; the list first at every width, and the Everyone thread beside it from 1024 px, not read until it is seen. The home's Chat card opens Everyone directly |
| The cut-overs of a conversation's time | [Conversations](chat/conversations/README.md): the clock time today, the weekday within the past week, then the date, with its year when it is another year |
| How a direct message is addressed and read | [Direct messages](chat/direct-messages/README.md): `/p/:popkinId/chat/:memberId`, by the other member's membership id; `PUT …/threads/direct/{memberId}`, 200 or 201, is its only read of the header |
| Who hears a direct message's events | [Direct messages](chat/direct-messages/README.md): `IPopkinNotifier` takes an `Audience` the handler decides; for a direct message, and its call, the people of its two members who have not left, never the Popkin's group |
| Whether the unread counts of the home and My Popkins include direct messages | [Direct messages](chat/direct-messages/README.md): yes, in the API, those whose other member has not left; the web app shows it on the home's and My Popkins' Chat counts |
| Whether the recap counts direct messages | [Recap](wrap-up/recap/README.md): no; it counts what members wrote in Everyone |
| How the other member learns of a direct call | [Group call](calls/group-call/README.md): from the banner "Call · {n} on the call" in the direct message, for now; ringing and notification stay open (known gap 12) |
| Whether a direct call and the group call run at once, and which call Everyone's thread names | [Group call](calls/group-call/README.md): the API allows both at once, and a device's `CallSession` holds one, leaving the first when another starts; Everyone's thread names the group call. A call has no `Kind`: `ThreadId` null is the group call |
| The address, heading and waiting copy of a direct call | [Group call](calls/group-call/README.md): `/p/:popkinId/chat/:memberId/call`; the other member's name, "Just the two of you · 12:48"; "Waiting for {first name}" and "{first name} sees the call in your chat and can join with one tap.", drawn by no mock; "Only you and {first name} can join this call." under the pane |
| The mocks of a direct message that is read-only or has a call under way | [Direct messages](chat/direct-messages/README.md): `direct-message/read-only.html` and `call.html`, added in journey 11 |
| The quick reactions, "More reactions", the names of the chips, Delete and the toasts of message actions | [React to a message](chat/react-to-message/README.md): five quick reactions, as L2-024 asks, and twelve more; a fixed table of 17 names in the `api` library; Delete asks first (`delete-message/default.html`); "Message copied.", "We couldn't save your reaction." and "We couldn't delete your message." |
| The quote's name, its snippet, the mark after a jump and how a jump reaches an older message | [Reply to a message](chat/reply-to-message/README.md): "Go to {first name}'s message"; the first line, at most 120 characters, cut on the server between two grapheme clusters and with no ellipsis; 2 seconds, an outline as well as a tint (`group-chat/marked.html`); the store loads earlier pages, with no read around a message. A deleted quote: `group-chat/deleted-quote.html` |
| Whether `ReactionsChanged` carries a version, and how one emoji compares with another in the database | [React to a message](chat/react-to-message/README.md): the message's `reactionsVersion`, in the answer and the event, which a repeat that changes nothing keeps (known gap 70); the binary collation `Latin1_General_100_BIN2` on SQL Server |
| How a photo is chosen in chat, and the mocks of its preview and its refusal | [Send photos in chat](chat/send-photos-in-chat/README.md): the device's picker, one photo, no dialog; the Add photos dialog stays the album's. `group-chat/photo-preview.html` (`composer__photo`, "Remove photo") and `photo-refused.html` (`composer__alert`, the album's words, "Dismiss") |
| When a chat photo uploads, its codes and its request limit | [Send photos in chat](chat/send-photos-in-chat/README.md): when its message is sent, by the outbox, which reuses the `photoId` on a retry; the album's `photo_type_not_allowed` and `photo_too_large`; 10 MB plus 64 KB |
| The alt text and the name of a chat photo, and what choosing it opens | [Send photos in chat](chat/send-photos-in-chat/README.md): alt "Photo from {first name}" ("Your photo"); a link "Open photo from {first name}" ("Open your photo"), `a.bubble__photo`; the photo view, in Everyone and in a direct message |
| When an Everyone photo joins the album, and who reads a direct-message photo | [Send photos in chat](chat/send-photos-in-chat/README.md): when its message is sent, with `PhotosAdded`; only the direct message's two members, `404` `photo_not_found` to anyone else, and never in the album, its summaries or its zip (`Photo.InAlbum`, `Photo.ThreadId`) |
| What a quote and a preview show for a photo message with no text, and what deleting one does to its photo | [Send photos in chat](chat/send-photos-in-chat/README.md): "Photo" ("You: Photo"; the client's own lines, known gap 76); the message goes, an Everyone photo stays in the album and a direct-message photo is removed |
| A send with neither text nor photo, when an Everyone photo is added, a body over the request limit, and two sends of one photo | [Send photos in chat](chat/send-photos-in-chat/README.md): `400` `message_empty` "Write a message or choose a photo."; its `AddedAt` is when its message is sent; `413` `request_too_large` for every upload ([Input validation and encoding](security/input-validation-and-encoding/README.md)); a unique index on `Message.PhotoId`, and the loser is `400` `photo_not_found` |

## Diagrams

Each feature's `diagrams/` folder holds PlantUML sources (`.puml`) and their rendered images
(`.png`). Render the tree after changing a source:

```sh
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The script needs PlantUML and Graphviz on the machine.
