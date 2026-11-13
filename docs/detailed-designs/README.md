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
- **Popkin Worker** — .NET worker service for scheduled jobs such as wrapping up a Popkin whose
  time is up.
- **Popkin database** — SQL Server through EF Core.
- **Photo store** — object storage for photo files. Provider: `<TO SUPPLY>`.

External systems: an SMS provider and an email provider deliver six-digit codes, and a media
relay (STUN/TURN) carries WebRTC calls. Each provider is `<TO SUPPLY>`.

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
  `popkin_wrapped_up`, `429` `rate_limited`.
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
event name (`PopkinMetrics`). The other instruments of the table, and the exporter set-up of
ADR 0012, are not built.

## Conflicts between the mocks and the specs

Each design follows the source named below and marks the conflict in its own README.

- The reactions dialog shows six quick reactions, while L2-024 asks for five
  ([React to a message](chat/react-to-message/README.md)).
- The score bars scale to the largest count, while L2-038 AC2 asks for each value's share
  ([View an experience](experiences/view-experience/README.md)). The design follows the mock.
- The album thumbnails carry empty `alt` text, while L2-032 AC7 names the text
  ([Browse the album](photos/browse-album/README.md)). The design follows the requirement.
- The invite dialog, the created screen and "Got a code?" show the short link `popk.in/lakeside`,
  while L2-065 builds the link on the Popkin's address and L2-011 AC5 no longer allows a code the
  Host chose ([Invite people](invitations/invite-people/README.md),
  [Join by code](invitations/join-by-code/README.md)). The design follows the requirement; the
  mocks need the new link.
- L2-064 AC7 asks for the not-found screen at a host more than one label deep
  (`a.b.popkin.community`), while a wildcard certificate covers one label only, so the browser
  refuses the connection before any screen loads, and L2-067 AC5 refuses such a host with `400`
  ([Address safety](security/address-safety/README.md)). The design follows L2-067 AC5; whether a
  certificate for deeper hosts is wanted is open (known gap 19).
- L2-002 AC4 shows "Sign in" from 640 px, while the design system's responsive page says
  576 px ([Responsive layout](accessibility/responsive-layout/README.md)). The design follows
  the requirement.

## Subsystems and features

| Subsystem | Feature | L2 requirements |
|-----------|---------|-----------------|
| Landing | [View the landing page](landing/view-landing-page/README.md) | L2-001, L2-002, L2-061 |
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
| 1 | SMS provider and email provider for the six-digit codes ([Sign up](accounts/sign-up/README.md)) | First deployment; journeys 1, 2 and 6 outside Development | |
| 2 | Where `Auth:CodeHashKey` is stored and how it is rotated ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 3 | Reverse proxy product in front of the API ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 4 | Where the images run, where they are pushed and how a release is rolled back ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 5 | Hosting of SQL Server and key management for encryption at rest ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 6 | Telemetry backend, log retention and alert thresholds ([ADR 0012](../adr/0012-opentelemetry.md)) | First deployment | |
| 7 | Load target: concurrent connections and "normal load" ([Fast screens](reliability/fast-screens/README.md), [Live messages](chat/live-messages/README.md)) | Nothing yet; ends [ADR 0009](../adr/0009-one-api-instance.md) when it passes one instance | |
| 8 | Whether closing a person's open hub connections at sign-out is needed ([Live messages](chat/live-messages/README.md)) | Sign out (journey 17). Journey 3 was built without it: there is no sign-out yet, and nothing closes a connection | |
| 9 | Photo store provider and the management of its keys ([Add photos](photos/add-photos/README.md)) | First deployment with profile photos (journey 2) or with the album: journey 5 is built, and outside Development no photo can be added, because there is no photo store there; journeys 13 and 14 outside Development | The contract and the address scheme are settled by [Join a Popkin](invitations/join-popkin/README.md): `IPhotoStore`, with addresses the API signs and serves for one hour. The provider behind it stays open |
| 10 | Media topology for calls, mesh or SFU, and where an SFU would run ([Group call](calls/group-call/README.md)) | Journey 7 | |
| 11 | Media relay (STUN/TURN) provider and credential lifetime ([Group call](calls/group-call/README.md)) | Journey 7 | |
| 12 | How the other member learns of a direct call ([Group call](calls/group-call/README.md)) | Journey 11 | |
| 13 | How a hub event sent by the Worker reaches clients: a backplane, or another path ([Time is up](wrap-up/time-is-up/README.md), [ADR 0009](../adr/0009-one-api-instance.md)) | Journey 9. Until settled, the web app's clock check carries the wrap-up | |
| 14 | Number of Worker instances ([Time is up](wrap-up/time-is-up/README.md)) | Journey 9 | |
| 15 | Whether field measurement of screen speed is wanted, and its collector ([Fast screens](reliability/fast-screens/README.md)) | Nothing | |
| 16 | One command that starts the API, the Worker and the app (an AppHost, by ADR) | Nothing; wanted when the Worker hosts its first job (journey 9) | |
| 17 | DNS provider, wildcard certificate authority and renewal for `*.popkin.community` ([Address safety](security/address-safety/README.md)) | First deployment with addresses; L2-067 AC1 | |
| 18 | How each web app build sets `BASE_DOMAIN`, and whether development needs one session across `*.localhost` ([Open a Popkin by its address](popkins/open-by-address/README.md), [Address safety](security/address-safety/README.md)) | Building addresses (journey 1 rework) | |
| 19 | Whether a host more than one label deep should reach the not-found screen, which needs a certificate beyond the wildcard (L2-064 AC7 against L2-067 AC5) | Nothing | |
| 20 | Mocks for the address field, the not-here screen, the address on the created screen and in Edit name and look, and the invite link on the address ([Choose the address](popkins/choose-address/README.md)) | Building addresses | |
| 21 | Whether the photo view gains a visible previous and next control. It has none, as the mock draws none, so a member who uses a pointer and cannot swipe cannot move between photos (WCAG 2.5.1, L2-057) ([View a photo](photos/view-photo/README.md)) | Nothing built; L2-057 for the photo view | |
| 22 | Whether "Save photo" must save the photo at the size it was added (L2-036 AC1). The file a member chooses is not kept: the stored display image is at most 2048 px on its longest edge, and that is what would be saved ([Add photos](photos/add-photos/README.md), [Save a photo](photos/save-photo/README.md)) | Journey 14 | |
| 23 | Whether starting a Popkin adds the connections its creator already holds to the new Popkin's hub group. `CreatePopkinCommandHandler` does not, so a person who starts a Popkin in one tab gets no event for it in another until the hub reconnects ([My Popkins](popkins/my-popkins/README.md), [Live messages](chat/live-messages/README.md)) | Nothing; found in journey 6 | |
| 24 | How the app opens without a connection, and whether every screen keeps a saved answer. There is no service worker, so the app does not open offline from cold, and only My Popkins keeps a saved list; the `ResponseCache`, `screenLoad()` and `httpErrorInterceptor` of the design are not built ([Loading, failure and offline](reliability/loading-failure-offline/README.md)) | L2-056 AC4 for every screen but My Popkins | |
| 25 | Clearing the saved list of My Popkins at sign out and at account deletion (L2-054). Only a 401 clears it today ([My Popkins](popkins/my-popkins/README.md)) | Journeys 17 and 19 | |
| 26 | Screens My Popkins and the scanner link to that are not built: Join with a code (`/join`, journey 15), the recap (`/p/:popkinId/recap`, journey 9) and the account (`/account`, journey 17). Each link reaches the not-found screen until its journey | Journeys 9, 15 and 17 | |

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
| How many queries the list of My Popkins takes, and which threads its unread count covers | [My Popkins](popkins/my-popkins/README.md): up to nine, none per Popkin; the Everyone thread, until direct messages are built |
| The scanner's fallback decoding library, its design-system page and what a device with no camera is shown | [Join by scanning or typing a code](invitations/join-by-code/README.md): `jsqr`, loaded on demand; `scanner.html`; the denied state and its copy |

## Diagrams

Each feature's `diagrams/` folder holds PlantUML sources (`.puml`) and their rendered images
(`.png`). Render the tree after changing a source:

```sh
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The script needs PlantUML and Graphviz on the machine.
