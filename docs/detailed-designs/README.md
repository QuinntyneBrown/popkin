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
- **Photo store** — object storage for photo files: a private Azure Blob Storage container ([ADR 0022](../adr/0022-photos-in-azure-blob-storage.md)).

External systems: an SMS provider and an email provider deliver six-digit codes, and a media
relay (STUN/TURN) helps the browsers on a call reach each other. Azure Communication Services is
both the SMS and the email provider ([ADR 0021](../adr/0021-codes-and-invites-by-azure-communication-services.md)). The media relay is any TURN server that takes shared-secret credentials, and a
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
- **A state event may carry its version alone** when its state is too large to send whole.
  `PlanChanged(popkinId, version)` is one: the client reads the state again (the board, the
  burn-down or the home's summary) when the version is above the one it holds, and drops it
  otherwise ([Plan board](plan/plan-board/README.md)).
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
| L2-140 AC1 | A reminder arrives at 9 am | `popkin.contacts.reminders.lateness`, now minus the owner's 9 am at sending | [Reminders](contacts/reminders/README.md) |

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
- The admin mocks differ from their requirements in places, and each admin design follows the
  requirement: the limits page's rows and values (L2-117), the roles table's rows (L2-086), the
  failure copy and the hint of the reason field (L2-087), the settings list (L2-118), a long call
  flagged by colour alone (L2-112 AC2), charts without their figures as text (L2-091 AC4), a job
  log that names an album (L2-113 AC2), the "+n days" toggles where L2-105 asks for a radio group,
  and hosted Popkins that "pass to the longest-standing member" where L2-098 wraps them up. Also:
  the Popkins "Show" filter drawn as tabs where it is a radio group (L2-102); the Reports mock
  without the context messages, the direct-message state, a photo's caption or an experience's
  picture (L2-109); the reason field's failure copy and hint in the moderation and Popkin dialogs
  (L2-087); a "Region" row on a Popkin and on a live call, and Health figures (database CPU,
  replica lag, storage, reconnect rate, region, on-call name), which no requirement asks for and
  the API does not keep; the more-time toast's "The Host has been told", which no requirement
  does; an "In-app request" data request, which nothing in the Popkin app makes; and switched-off
  actions drawn `disabled` with a `title`, where [Admin roles](admin-access/admin-roles/README.md)
  keeps them focusable with `aria-disabled` so the reason is reachable (L2-086 AC2, WCAG), as
  journey 24 built them.

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
| Accounts | [Terms and Privacy notice](accounts/legal-pages/README.md) | L2-082, L2-083, L2-003 |
| Popkins | [Start a Popkin](popkins/start-popkin/README.md) | L2-008, L2-009, L2-010, L2-062, L2-065 |
| Popkins | [Choose the address](popkins/choose-address/README.md) | L2-062, L2-063, L2-067 |
| Popkins | [Open a Popkin by its address](popkins/open-by-address/README.md) | L2-064 |
| Popkins | [My Popkins](popkins/my-popkins/README.md) | L2-017, L2-018, L2-064 |
| Popkins | [Popkin home](popkins/popkin-home/README.md) | L2-019 |
| Popkins | [Popkin settings](popkins/popkin-settings/README.md) | L2-020, L2-066 |
| Popkins | [Leave a Popkin](popkins/leave-popkin/README.md) | L2-047 |
| Popkins | [Choose a Popkin's features](popkins/choose-features/README.md) | L2-152, L2-153 |
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
| Schedules | [Time off](schedules/time-off/README.md) | L2-072, L2-073 |
| Schedules | [This week](schedules/this-week/README.md) | L2-074, L2-075 (AC2, AC3) |
| Schedules | [Set the event](schedules/set-the-event/README.md) | L2-085, L2-020 |
| Schedules | [Schedules switch](schedules/schedules-switch/README.md) | L2-077 |
| Plan | [Plan board](plan/plan-board/README.md) | L2-068, L2-070 (AC5 to AC7) |
| Plan | [Add a story](plan/add-a-story/README.md) | L2-069 |
| Plan | [Change a story](plan/change-a-story/README.md) | L2-070 |
| Plan | [Burn-down](plan/burn-down/README.md) | L2-071 |
| Plan | [Plan on the home and in the recap](plan/plan-on-the-home-and-recap/README.md) | L2-075 (AC1, AC3, AC4) |
| Plan | [Plan switch](plan/plan-switch/README.md) | L2-077 |
| Admin access | [Admin sign in](admin-access/admin-sign-in/README.md) | L2-088, L2-078 |
| Admin access | [The admin shell](admin-access/admin-shell/README.md) | L2-089, L2-078 |
| Admin access | [Admin roles](admin-access/admin-roles/README.md) | L2-086 |
| Admin access | [A reason for every change](admin-access/give-a-reason/README.md) | L2-087 |
| Admin access | [Audit log](admin-access/audit-log/README.md) | L2-120 |
| Admin access | [Admins & roles](admin-access/manage-admins/README.md) | L2-119 |
| Admin overview | [Dashboard](admin-overview/dashboard/README.md) | L2-090 |
| Admin overview | [Metrics](admin-overview/metrics/README.md) | L2-091 |
| Admin overview | [Health](admin-overview/health/README.md) | L2-092 |
| Admin people | [People](admin-people/find-people/README.md) | L2-093 |
| Admin people | [A person](admin-people/view-person/README.md) | L2-094, L2-078 |
| Admin people | [Suspend a person and lift it](admin-people/suspend-person/README.md) | L2-095, L2-096 |
| Admin people | [Sign a person out everywhere](admin-people/sign-person-out/README.md) | L2-097 |
| Admin people | [Start a deletion](admin-people/start-deletion/README.md) | L2-098 |
| Admin people | [The deletion queue](admin-people/deletion-queue/README.md) | L2-099 |
| Admin people | [Export a person's data](admin-people/export-person-data/README.md) | L2-100 |
| Admin people | [Data requests](admin-people/data-requests/README.md) | L2-101 |
| Admin Popkins | [Find Popkins](admin-popkins/find-popkins/README.md) | L2-102 |
| Admin Popkins | [A Popkin](admin-popkins/view-popkin/README.md) | L2-103, L2-078 |
| Admin Popkins | [Wrap up a Popkin now](admin-popkins/wrap-up-now/README.md) | L2-104 |
| Admin Popkins | [Give a Popkin more time](admin-popkins/give-more-time/README.md) | L2-105 |
| Admin Popkins | [Remove a member](admin-popkins/remove-member/README.md) | L2-106 |
| Admin Popkins | [Reset the invite](admin-popkins/reset-invite/README.md) | L2-107 |
| Moderation | [Report content](moderation/report-content/README.md) | L2-108 |
| Moderation | [Reports](moderation/review-reports/README.md) | L2-109 |
| Moderation | [Remove reported content or dismiss the report](moderation/decide-report/README.md) | L2-110 |
| Moderation | [Moderation view](moderation/moderation-view/README.md) | L2-111 |
| Admin operations | [Live calls](admin-operations/live-calls/README.md) | L2-112 |
| Admin operations | [Jobs](admin-operations/jobs/README.md) | L2-113 |
| Admin operations | [Album exports](admin-operations/album-exports/README.md) | L2-114 |
| Admin platform | [Feature switches](admin-platform/feature-switches/README.md) | L2-076, L2-077 |
| Admin platform | [Announcements](admin-platform/announcements/README.md) | L2-115 |
| Admin platform | [See an announcement](admin-platform/see-announcement/README.md) | L2-116 |
| Admin platform | [Limits](admin-platform/limits/README.md) | L2-117 |
| Admin platform | [Settings](admin-platform/settings/README.md) | L2-118 |
| Contacts | [Open Contacts](contacts/open-contacts/README.md) | L2-121, L2-123, L2-124 |
| Contacts | [Only you see your Contacts](contacts/contacts-privacy/README.md) | L2-122 |
| Contacts | [Today](contacts/today/README.md) | L2-125 |
| Contacts | [People](contacts/people/README.md) | L2-126, L2-127 |
| Contacts | [A contact's profile](contacts/contact-profile/README.md) | L2-128, L2-131 |
| Contacts | [Add or edit someone](contacts/add-contact/README.md) | L2-129, L2-130 |
| Contacts | [Delete a contact](contacts/delete-contact/README.md) | L2-132 |
| Contacts | [Log a conversation or milestone](contacts/log-entry/README.md) | L2-133, L2-134, L2-135 |
| Contacts | [Memories and files](contacts/memories/README.md) | L2-136 |
| Contacts | [Key dates](contacts/key-dates/README.md) | L2-137, L2-138, L2-139 |
| Contacts | [Reminders](contacts/reminders/README.md) | L2-140 |
| Contacts | [Follow-ups](contacts/follow-ups/README.md) | L2-141, L2-142 |
| Contacts | [Habits](contacts/habits/README.md) | L2-143, L2-144, L2-145 |
| Contacts | [Groups](contacts/groups/README.md) | L2-146, L2-147, L2-148 |
| Contacts | [Connections](contacts/connections/README.md) | L2-149, L2-150 |
| Contacts | [Import from your Popkins](contacts/import-from-popkins/README.md) | L2-151 |
| Notifications | [Notification settings](notifications/notification-settings/README.md) | L2-154, L2-155, L2-156, L2-157, L2-048 |
| Notifications | [Each Popkin's level](notifications/popkin-levels/README.md) | L2-158 |
| Notifications | [Birthday reminders by person](notifications/birthday-reminders-by-person/README.md) | L2-159, L2-139 |
| Notifications | [Mute people](notifications/mute-people/README.md) | L2-160 |
| Notifications | [Deliver notifications](notifications/deliver-notifications/README.md) | L2-161, L2-174, L2-175 |
| Notifications | [Popkin update email](notifications/popkin-update-email/README.md) | L2-163, L2-164 |
| Notifications | [Digest emails](notifications/digest-emails/README.md) | L2-165 |
| Notifications | [Send reminders](notifications/send-reminders/README.md) | L2-162, L2-166, L2-167, L2-140 |
| Notifications | [Unsubscribe](notifications/unsubscribe/README.md) | L2-168 |
| Admin platform | [Member email and notification kinds](admin-platform/notifications/README.md) | L2-169, L2-170, L2-171 |
| Admin platform | [Notification holds](admin-platform/notification-holds/README.md) | L2-172 |
| Admin platform | [Notification defaults](admin-platform/notification-defaults/README.md) | L2-173 |

Every L2 requirement from L2-001 to L2-067 is realised by at least one feature above, and so is
every admin requirement, L2-076 to L2-078 and L2-086 to L2-120, and every Contacts requirement,
L2-121 to L2-151.

## The admin app

The admin designs share one architecture, recorded in
[ADR 0024](../adr/0024-admins-moderation-and-switches-in-the-database.md) (Accepted), which
amends [ADR 0016](../adr/0016-admin-app.md):

- **Popkin admin app** — a sixth container, the Angular application `frontend/projects/admin` at
  `https://admin.popkin.community`, on the `api` and `components` libraries. It calls the Popkin
  API under `/api/admin/**` and polls instead of holding a hub connection.
- **Admins** are `Admin` rows with an `AdminRole` (Owner, Support, Viewer); `Admin:FirstOwner`
  names the first Owner. An admin is not a `Person`.
- **The admin session** is `AdminSession` behind the cookie `__Host-popkin-admin` and the
  authentication scheme `Admin`, checked on every request.
- **The role is checked in the handler**: `IAdminGuard.RequireAsync(AdminAction)` against
  `AdminPermissions` (L2-086), `403` `role_not_allowed`. `GET /api/admin/me` tells the app what
  to disable.
- **Every change writes an `AuditEntry` in the same transaction** through `IAuditLog`; a write
  carries a `reason` validated by `ReasonRules` where L2-087 asks for one.
- **Moderation** sees content only through a report and its context, or a 30-minute
  `ModerationView` opened for a reason ([Moderation view](moderation/moderation-view/README.md)).
- **Feature switches and limits** are rows read through one cached `PlatformSnapshot`
  (`IFeatureSwitches`, `ILimits`), honoured within a minute
  ([Feature switches](admin-platform/feature-switches/README.md), [Limits](admin-platform/limits/README.md)).
  `Features:Schedules` is retired; `Features:PhoneSignIn` stays a setting (ADR 0023).
- **What every person sees** (a switch, an announcement) is polled every 60 seconds; no event goes
  to all connections.

## Contacts

The Contacts designs (`contacts/`, L1-029 to L1-038) share one architecture. Contacts is a
person's own address book inside the Popkin web app; it adds no container.

- **One owner.** Every Contacts row carries `OwnerId`, the `Person` who made it. Each handler reads
  and writes only rows whose `OwnerId` is `ICurrentPerson.PersonId`. `IContactGuard.RequireOwnedAsync`
  loads a contact, group or other Contacts row for its owner and answers `404` `contact_not_found`
  (or `group_not_found`, `follow_up_not_found`, `habit_not_found`) for any other person's, so a contact's existence is never disclosed, as
  `popkin_not_found` does for a Popkin (L2-122). Nothing in Contacts is shared with another person
  or an admin, and nothing tells a contact anything. The one message a contact can receive is an
  ordinary Popkin invite, sent when the owner starts a Popkin with a group (L2-148 AC3); it says
  nothing of Contacts.
- **Owned rows.** Each Contacts entity implements `IOwnedByPerson`, and every query starts from
  `OwnedQueries.OwnedBy(personId)` ([Only you see your Contacts](contacts/contacts-privacy/README.md)).
- **The device's day.** "Today" is the owner's day, not the server's: each Contacts read that
  depends on it takes `?on=yyyy-MM-dd` from the device and answers `400` `invalid_date` for
  anything else, which also fixes the day for recordings and tests. The web app's rules (due
  buckets, overdue habits, the badge) use the same day.
- **A resend saves once.** Each write carries a `clientId`; the row implements `IClientWrite`,
  a unique index on (`OwnerId`, `ClientId`) keeps one, and a resend answers with the row already
  saved (`ClientWrites.FindAsync`, [Open Contacts](contacts/open-contacts/README.md)).
- **Entities** (`Popkin.Domain`, one table each): `Contact` (name, how the owner knows them, a
  `ContactCircle`, phone, email, city, how they met, loves, photo key, `IsClosest`, the
  `PersonId` of the account it was imported from, if any); `KeyDate` (a `KeyDateKind`, title, day,
  month, optional year, `EveryYear`, a `ReminderLead`); `ReminderPreferences` (one per owner: a
  default `ReminderLead` per kind, `PhoneNotifications`, `MondayEmail`); `TimelineEntry` (a
  conversation with its `TalkChannel`, or a milestone with its `MilestoneKind`); `Memory` (a photo,
  a file or a note); `FollowUp` (text, due day, `IsPromise`, the entry it came from, `DoneAt`);
  `Habit` and `HabitKept` (a `HabitRhythm` of weekly, every 2 weeks or monthly, and each period
  kept); `ContactGroup` and `ContactGroupMember` (a `GroupKind`, an emoji, a note, an optional
  linked `PopkinId`); `Connection` (two contacts, a `ConnectionKind`, the owner's words); `ContactReminder` (one per key
  date and day it falls on) and `ContactWeeklyEmail` (one per owner and week), which the reminders
  job writes so each is sent once ([Reminders](contacts/reminders/README.md)). The names
  avoid the existing `ContactChannel`, which is how a `Person` signs in.
- **Handlers** live in `Popkin.Application/Contacts/`, one folder per feature. Controllers are
  `Popkin.Api/Controllers/Contacts/*Controller.cs` under `/api/contacts/**`, behind the default
  authenticated policy; each sends one MediatR request.
- **Files.** A contact's photo and a memory's photo or file go to `IPhotoStore` under a random key,
  read through an address that expires, as the album's photos are (ADR 0022).
- **No hub events.** Contacts has one reader, its owner. A screen reads again when it opens and
  after its own writes; another device of the owner sees a change on its next read. Contacts adds
  nothing to `IPopkinClient` (L2-051).
- **Offline.** A write made offline waits in `ContactsOutbox`, modelled on the chat's
  `MessageOutbox`, and is sent in order when the connection returns (L2-123 AC4). Deleting a contact and importing are sent at once,
  not queued: each shows its own failure (L2-132 AC3) or depends on what the API holds.
- **Reminders** are the Worker's: `SendContactRemindersJob` (a `PeriodicJob`, every 5 minutes)
  adds the reminders and sends the Monday emails that are due. It finds the owner's 9 am in the
  zone each Contacts page saves; reads use the device's day instead. Every Contacts page reads
  the in-app reminders as it opens. The phone is reached by Web Push
  ([ADR 0028](../adr/0028-phone-reminders-by-web-push.md)) and the email by Azure Communication
  Services ([ADR 0021](../adr/0021-codes-and-invites-by-azure-communication-services.md))
  (known gap 104 ruled).
- **Web app.** The pages are `frontend/projects/popkin/src/app/pages/contacts-*`, the dialogs
  `app/dialogs/` as usual, on routes `/contacts`, `/contacts/people`, `/contacts/people/new`,
  `/contacts/people/:id`, `/contacts/people/:id/edit`, `/contacts/people/:id/log`,
  `/contacts/dates`, `/contacts/follow-ups`, `/contacts/habits`, `/contacts/groups` and
  `/contacts/connections`, with `shell: 'app'` and the Contacts `pk-popkin-nav`, except the
  forms with their own top bar, `/contacts/people/new`, `/contacts/people/:id/edit` and
  `/contacts/people/:id/log`, which use `shell: 'bare'`. A profile sets the route data
  `phoneTabs: false`, so a phone shows only its back link (L2-121 AC6). A profile's history tab
  is in its query, `?view=timeline|follow-ups|memories`, and an open group is
  `/contacts/groups?group={id}`. The Follow-ups badge of the navigation counts with the
  `lateOrDueToday` rule of [Follow-ups](contacts/follow-ups/README.md) (L2-121 AC5). The `api` library
  holds `CONTACTS_API` (`ContactsApi`, `HttpContactsApi`) and one store per screen under
  `frontend/projects/api/src/lib/api/contacts/`, with the rules (due buckets, overdue habits,
  counts) unit tested (ADR 0011).
- **Components.** The Contacts components are rows 12 to 26 of
  [the component backlog](../component-backlog.md). Built in the library (ADR 0025):
  `pk-contacts-page` and `pk-contacts-grid`, `pk-list-head`, `pk-contact-list` and `pk-closest`,
  `pk-info-card` and `pk-add-card`, `pk-form-sections` with `pk-form-section`, `pk-date-entry`,
  `pk-person-pick` and `pk-kind-grid`, `pk-keep-strip` and `pk-habit-row`, and
  `pk-group-browser`; `pk-contact-id` with `pk-contact-facts`, `pk-likes` and `pk-memory-grid`,
  `pk-contact-timeline` with `pk-contact-timeline-item`, `pk-task` with `pk-add-field` and
  `pk-promise`, `pk-spotlight` with `pk-date-tile`, and `pk-connection-map` with `pk-link-key`,
  whose focus and filter are `connectionMapOf` in the `api` library. Still to build: the rows the
  designs added (`pk-filter-chips`, `pk-list-row`, a link form of `pk-who-chips`, `pk-tick-list`). Each design
  names the ones its screens compose.
- **Words.** A contact is named by first name, never a pronoun (L2-122 AC4). No log, metric or span
  carries a contact's name, phone, email, note or any text the owner typed.
- **Deleting** a contact and deleting an account remove the same rows through `ContactRemoval`
  ([Delete a contact](contacts/delete-contact/README.md)); an account takes its Contacts with it
  (L2-049).

## Notifications

The notification designs (`notifications/`, L1-040 to L1-042, and three admin features in
`admin-platform/`) share one architecture. Notifications add no container: the Popkin API
records what happened and saves each person's settings, and the Popkin Worker decides who hears
of it, when and how, and sends it. The Worker still sends no hub events
([ADR 0015](../adr/0015-the-worker-sends-no-hub-events.md)).

- **One catalogue.** `NotificationKind` (Domain) holds the twelve kinds of L2-154.
  `NotificationCatalogue` gives each kind its `NotificationGroup` (`Activity`, `Reminders`,
  `Account`), its default email and phone setting, whether it is required, and the feature it
  belongs to (`Plan` for "Plan changes" and "Stories due", `Schedules` for "Schedule changes").
  The API, the Worker and both web apps read the same list; the web apps get it with the
  settings, never from a copy of their own.
- **An outbox, written with the change.** A handler whose change notifies adds one
  `NotificationEvent` row in its own unit of work: `Kind`, `PopkinId?`, `ActorPersonId?`,
  `SubjectId` (the message, photo batch, story or membership), `RecipientPersonId?` (set for a
  direct message, a reply or a story given to someone) and `OccurredAt`. The row holds ids only;
  no message text, caption or name. The Worker reads what to say when it sends, so an edit or a
  deletion made in the meantime is honoured. A change and its event are saved together or not at
  all. `IPopkinNotifier` keeps sending the live hub events as before; the two do not depend on
  each other.
- **Fan-out and rules in one place.** `DispatchNotificationsJob` (Worker, `PeriodicJob` every
  15 seconds) sends `DispatchNotificationsCommand`. Its handler expands each new event into one
  `NotificationDelivery` per recipient and channel, decides each through `NotificationRules`
  (the order of L2-161 AC1, the levels of L2-158, quiet hours, the daily most), and either holds
  it in an email bundle, schedules it for later, or marks it `Suppressed` with the rule that
  stopped it. `NotificationRules` is a pure type, tested one case per row
  ([Deliver notifications](notifications/deliver-notifications/README.md)).
- **Read again at send time.** Membership, the Popkin's features, mutes, holds, the platform
  pause and the person's settings are read at the moment of sending as well as at fan-out
  (L2-174 AC1). A delivery that no longer passes is suppressed, not sent.
- **Once only.** `NotificationDelivery` has a unique key (`EventId`, `PersonId`, `Channel`);
  an `OutgoingEmail` has a unique `DedupKey` (`update:{bundleId}`, `digest:{personId}:{date}`,
  `reminder:{kind}:{subjectId}:{dueOn}:{personId}`). A retried tick or a second run finds the row
  and sends nothing more (L2-175 AC3).
- **Settings.** `NotificationPreferences` (one per `Person`): `EmailOn`, a nullable
  `Frequency`, and the time zone. `NotificationKindChoice` rows (`PersonId`, `Kind`, nullable
  `Email`, nullable `Phone`) exist only for what the person changed; a null follows the
  catalogue default. A null `Frequency` (and a null birthday lead) follows the Owner's default for
  new members, so a new default reaches everyone who has not chosen (L2-173 AC4). A Popkin's level is
  `Membership.NotificationLevel` (`Everything`, `JustForMe`, `Muted`). A muted person is a
  `PersonMute` row (`PersonId`, `MutedPersonId`). A birthday's switch is `KeyDate.RemindersOn`
  beside its existing `ReminderLead`.
- **Time zone.** `ReminderPreferences.TimeZone` moves to `NotificationPreferences.TimeZone`, saved
  by the web app with `PUT /api/me/time-zone` when it starts, not only when Contacts opens. Every
  "where the person is" rule reads it, and UTC before one is saved (L2-161 AC7).
- **Platform controls.** `NotificationPlatform` (one row): `EmailPausedAt?`, `PausedByAdminId?`,
  `PauseReason?` and the defaults of L2-173. `NotificationKindSwitch` rows hold a kind off for
  everyone, with who, when and why. `NotificationHold` rows hold a Popkin or a person by hand.
  Suspended and deleting accounts are held by rule from `Person`, not by a row. They are read
  through the cached `PlatformSnapshot` and honoured within a minute, as feature switches are,
  except a pause, which the dispatcher reads from the database on each tick (L2-170 AC2).
- **Channels.** Email goes through `INotificationEmailSender`, implemented with Azure
  Communication Services email as the codes are ([ADR 0021](../adr/0021-codes-and-invites-by-azure-communication-services.md)),
  from `Notifications:EmailSender` on `popkin.community` with the display name "{first name} via
  Popkin" or "Popkin". Phone alerts go through `IPhoneNotificationSender`, widened from Contacts'
  reminder to a `PhoneAlert` (`Title`, `Body`, `Url`), by Web Push
  ([ADR 0028](../adr/0028-phone-reminders-by-web-push.md)). Sign-in codes keep their own path
  (`ICodeSender`) and never pass through notifications, so nothing here can stop them.
- **Emails are built from templates.** `INotificationEmailRenderer` (Infrastructure) turns a
  typed model into an HTML part and a plain-text part, escaping every member's text. The template
  technology needs its own ADR (gap 128).
- **Links.** Every link in an email is built by `PopkinUrlBuilder` and opens a screen that asks
  for a session (L2-163 AC6). The one link that works without a session is the unsubscribe link,
  which carries an `UnsubscribeToken` protected by ASP.NET Core Data Protection with the purpose
  `Popkin.Notifications.Unsubscribe` and a lifetime of 90 days
  ([Unsubscribe](notifications/unsubscribe/README.md)).
- **Telemetry** (`PopkinMetrics`, meter `Popkin`): `popkin.notifications.events`,
  `popkin.notifications.deliveries` by `kind`, `channel` and `outcome` (`sent`, `suppressed`,
  `failed`, `dropped`), `popkin.notifications.suppressed` by `rule`, and the histogram
  `popkin.notifications.email_latency` (from the window closing to the provider accepting). No
  dimension, log or span carries a person, an address, a name, text or a token (L2-174 AC3).
- **Contacts' reminders join this path.** `SendContactRemindersJob` keeps adding the in-app
  reminder and hands email and phone to notifications as the "Birthdays" kind. The Monday email,
  `ContactWeeklyEmail`, `IContactsEmailSender` and the two switches on Dates are removed (L2-140,
  gap 126) ([Send reminders](notifications/send-reminders/README.md)).

## Known gaps

The designs mark what is not decided with `<TO SUPPLY>`. Most markers are copy or a value. The
ones below are decisions that shape the architecture; a journey cannot be finished, and some
cannot start, until its row is settled. When a gap is settled, its row stays and names the ADR
or design that settled it.

| # | Open decision | Blocks | Settled by |
|---|---|---|---|
| 1 | SMS provider and email provider for the six-digit codes ([Sign up](accounts/sign-up/README.md)) | First deployment; journeys 1, 2 and 6 outside Development; the crew invites of journey 9, which are accepted and send nothing until a provider is chosen ([Recap](wrap-up/recap/README.md)) | [ADR 0021](../adr/0021-codes-and-invites-by-azure-communication-services.md): Azure Communication Services, email from `popkin.community` and SMS from a toll-free number. Phone codes wait for the number's verification. Closed |
| 2 | Where `Auth:CodeHashKey` is stored and how it is rotated ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 3 | Reverse proxy product in front of the API ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 4 | Where the images run, where they are pushed and how a release is rolled back ([ADR 0013](../adr/0013-deployment-shape.md)) | First deployment | |
| 5 | Hosting of SQL Server and key management for encryption at rest ([Personal data protection](security/personal-data-protection/README.md)) | First deployment | |
| 6 | Telemetry backend, log retention and alert thresholds ([ADR 0012](../adr/0012-opentelemetry.md)) | First deployment | |
| 7 | Load target: concurrent connections and "normal load" ([Fast screens](reliability/fast-screens/README.md), [Live messages](chat/live-messages/README.md)) | Nothing yet; ends [ADR 0009](../adr/0009-one-api-instance.md) when it passes one instance | |
| 8 | Whether closing a person's open hub connections at sign-out is needed ([Live messages](chat/live-messages/README.md)) | Sign out (journey 17). Journey 3 was built without it: there is no sign-out yet, and nothing closes a connection | Journey 17: the web app stops its own connection when it signs out or deletes the account; closing the other connections of a revoked session on the server stays open ([Manage the account](accounts/manage-account/README.md)) |
| 9 | Photo store provider and the management of its keys ([Add photos](photos/add-photos/README.md)) | First deployment with profile photos (journey 2) or with the album: journey 5 is built, and outside Development no photo can be added, because there is no photo store there; journeys 13 and 14 outside Development. The album's zip of journey 9 is written to the same store, so outside Development an album export fails too | [ADR 0022](../adr/0022-photos-in-azure-blob-storage.md): Azure Blob Storage, a private container reached with the apps' managed identity; no key exists, and the API still signs and serves every address |
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
| 24 | How the app opens without a connection, and whether every screen keeps a saved answer. There is no service worker, so the app does not open offline from cold, and only My Popkins keeps a saved list; the `ResponseCache`, `screenLoad()` and `httpErrorInterceptor` of the design are not built ([Loading, failure and offline](reliability/loading-failure-offline/README.md)). The 300 ms wait of `screenLoad()` is built on its own as `DelayedLoading` (`api/loading/`, [ADR 0029](../adr/0029-one-library-no-unused-components.md)) | L2-056 AC4 for every screen but My Popkins | |
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
| 51 | A crew invite is delivered to nobody. In Development the sender writes one log line and sends nothing; outside Development no provider is configured, so nothing is sent and nothing is recorded as sent. The request is accepted with `202` either way, and the Host reads "Invites are on their way" ([Recap](wrap-up/recap/README.md)) | First deployment; with gap 1 | [ADR 0021](../adr/0021-codes-and-invites-by-azure-communication-services.md): a crew invite goes out by Azure Communication Services on the channel its member signs in with. Closed |
| 52 | A wrapped-up Popkin cannot be left, and nothing says whether it should be: Popkin settings opens from the home, and the home of a wrapped-up Popkin opens its recap ([Read-only Popkin](wrap-up/read-only-popkin/README.md), [Leave a Popkin](popkins/leave-popkin/README.md)) | Journey 18 | |
| 53 | The diagrams of the four designs of Wrap up and of [Popkin settings](popkins/popkin-settings/README.md) were not redrawn after journey 9. They show `CurrentPopkinStore`, `TimeLeftClock`, `activePopkinGuard` and `wrappedUpInterceptor`, a backplane between the Worker and the hub, validator and exception classes, `album_not_kept`, and a settings menu of four rows; each design says so above its diagrams | None | |
| 54 | Safety, Privacy and Help in the landing page's footer link to `/safety`, `/privacy` and `/help`, which have no screen, no requirement and no mock. Each shows the not-found screen ([View the landing page](landing/view-landing-page/README.md)) | First deployment: a public page that links to nothing; each needs a requirement and a mock first | |
| 55 | Whether `/welcome`, `/sign-up` and `/sign-in` also send a signed-in person to My Popkins. L2-002 AC3 asks it of the landing address only, and `signedOutGuard` is on that route only: a signed-in person who opens the welcome screen sees it ([View the landing page](landing/view-landing-page/README.md), [Sessions](accounts/sessions/README.md)) | None; found in journey 10. Sign out (journey 17) opens the welcome screen | |
| 56 | `pk-qr` has no parity spec, against [ADR 0008](../adr/0008-component-parity-specs.md), which asks one of every component. The mock draws a sample code and the app the real one, so the two never match; for the same reason the hero's parity compares the whole hero at 360 px, where the code does not show, and only its text and the preview's name at 1280 px. The code is left to the sweep ([View the landing page](landing/view-landing-page/README.md)) | None; a parity spec needs a mock that draws the real code of its link | The mocks that show the code of `popk.in/lakeside` now draw the real one, as the app encodes it at error correction H, and `qr.spec.ts` compares it in Invite and on the created screen ([ADR 0029](../adr/0029-one-library-no-unused-components.md)). Closed |
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
| 78 | Who runs Popkin (its legal name), the address to contact about personal data and the law that governs the Terms. The Terms and the Privacy notice show `<TO SUPPLY: …>` in their place ([Terms and Privacy notice](accounts/legal-pages/README.md)) | The toll-free verification of Popkin's SMS number (ADR 0021) | |
| 79 | Whether ADR 0024 is accepted: admins in the database, the host-only admin cookie, moderation through reports and a recorded view, switches Off, chosen or everyone | Every admin journey; the moderation view cannot be built under ADR 0016 | Accepted by the owner, 15 November 2026 |
| 80 | The Worker's jobs: L2-113 and its mock name four, while the designs add `PreparePersonDataExportsJob` ([Export a person's data](admin-people/export-person-data/README.md)), `PurgeOldAuditEntriesJob` ([Audit log](admin-access/audit-log/README.md)) and `CloseExpiredModerationViewsJob` ([Moderation view](moderation/moderation-view/README.md)); "daily at 03:00" is a schedule the job loop does not support yet ([Jobs](admin-operations/jobs/README.md)) | Jobs, the data export, the audit log's two-year deletion || In part, 15 November 2026 (journey 24, the designs' default): `PurgeOldAuditEntriesJob` runs once a day and deletes entries older than two years; the other jobs and the 03:00 schedule are settled with their journeys |
| 81 | How Metrics reads 14 days of figures: an in-API recorder writing `DailyFigure` rows, or the telemetry backend of known gap 6 ([Metrics](admin-overview/metrics/README.md)); which responses count as failed | Metrics and the dashboard's chart | |
| 82 | Health's thresholds for Degraded and Down, its check timeouts and the figures each card shows ([Health](admin-overview/health/README.md)) | Health | |
| 83 | The 30-day hold of a deletion: the built purge erases within a day, L2-099 holds 30 days and erases at 03:00 in a time zone not named; what cancelling a deletion restores once memberships are anonymised ([Start a deletion](admin-people/start-deletion/README.md), [The deletion queue](admin-people/deletion-queue/README.md)) | Start a deletion, the deletion queue; changes journey 19 | |
| 84 | Suspension and sign-in: refusing a code request would disclose that an account exists (L2-006 AC2), so the design refuses at confirmation only ([Suspend a person](admin-people/suspend-person/README.md)) | Suspend a person | |
| 85 | Mocks the admin designs need and do not have: "Removed by Popkin" in chat, the author's notice, the suspended-account screen, "This call was ended by Popkin", the removed member's screen, a Popkin that keeps going, and the sign-in's expired, resent and code-limit states; also an end more than a year away (`popkin-extend/too-far`), how the Popkins list goes past its first page and past seven members, a Support admin's page, the person page's "export building" line, the data-request dialog's "Received on" and "How it arrived", and the `contact_taken` copy. An address already an admin's (`admin-add/exists`) and the last Owner's row (`admins/last-owner`) were built in journey 24 with the designs' default copy, recorded in [Admins & roles](admin-access/manage-admins/README.md); their mocks are still to be drawn. Each design names the file it expects. The Report dialog and "Reported", the moderation view with "Open moderation view", and the announcement banner were drawn on 15 November 2026; a Support admin's Features page (`features/support`) in journey 23 | The matching slices (AGENTS.md: a mock before implementation) | |
| 86 | Where a session's device, place and app version come from (a user-agent parser, a geo-IP provider), and how long a session's address is kept ([A person](admin-people/view-person/README.md)) | A person's Sessions panel | |
| 87 | An admin's name (no screen asks for it; the design uses the email's local part) and how long an admin session lasts ([Admin sign in](admin-access/admin-sign-in/README.md), [Admins & roles](admin-access/manage-admins/README.md)) | Admin sign in || Settled 15 November 2026 (journey 24, the designs' default): an admin is named by their email's local part (`Admin.Name`) until a screen asks for a name, and an admin session lasts 12 hours (`AdminSession.Lifetime`) |
| 88 | An erased person's name in the audit log for two years, against the erasure of L2-049; the old and new invite codes in the audit log (L2-107 AC4) against L2-120 AC7 ([Audit log](admin-access/audit-log/README.md), [Reset the invite](admin-popkins/reset-invite/README.md)) | Audit log; Reset the invite | |
| 89 | Writes with no reason that the brief of these designs expected to carry one: adding an admin, announcements, Run now, Retry, Mark sent and the dismissal of a report (made optional). L2-087 AC1 is followed; whether it should list them is open | None; the designs follow L2-087 | |
| 90 | A report in a wrapped-up Popkin: L2-108 AC7 offers "Report" there, while L2-045 allows no action in a wrapped-up Popkin ([Report content](moderation/report-content/README.md)) | Report content | |
| 91 | The invite code's shape: the admin mocks and L2-102 search `PINE-4821`, while the codes issued are 10 random characters (L2-011 AC5) ([Find Popkins](admin-popkins/find-popkins/README.md)) | The no-results copy of Find Popkins | |
| 92 | The album export part in Limits: an export is one zip today, so it has no current value ([Limits](admin-platform/limits/README.md)) | Limits | |
| 93 | How a removed member's messages are "marked as from a former member" (L2-106 AC1), when a member who leaves keeps their name on their messages (L2-047) ([Remove a member](admin-popkins/remove-member/README.md)) | Remove a member | |
| 94 | Whether Live calls lists direct calls; the design lists group calls only ([Live calls](admin-operations/live-calls/README.md)) | Live calls | |
| 95 | The jobs' periods: Prepare album exports runs every 2 seconds in code, against "every 5 minutes" in L2-114, which would also break L2-046 AC4; the Jobs mock's periods differ from the code's; the Worker's 5-second poll of run requests is the design's proposal ([Jobs](admin-operations/jobs/README.md), [Album exports](admin-operations/album-exports/README.md)) | Jobs | |
| 96 | Values the admin designs leave `<TO SUPPLY>`: the page size and search delay of People and Popkins; a person export's format, how long a ready export and a sent data request are kept, and whether downloading an export asks for its own reason (L2-100 AC5); how often a colliding invite code is drawn again; each limit's maximum; how a release is named; a banner's default and latest end, how many earlier banners are listed, whether suspended people count in its audience and how two publishes at once are kept apart; whether removing a chosen Popkin is confirmed, the Chosen dialog's copy with none chosen and a never-changed switch's copy; the reports rate limit, the queue's paging, what the moderation view shows of reactions and comments, which reason the author's notice names and the view job's tick; the copy of the Report dialog, the moderation view, the admin invite and code emails and the console's label outside production. Each design marks its own | The matching slices | The feature switches' values settled in journey 23 with the design's defaults: a chosen Popkin is removed without confirming, the none-chosen copy, no "since" line for a switch never set, 20 search matches ([Feature switches](admin-platform/feature-switches/README.md)) |
| 97 | Comments on a story. L2-068 says they come later; until they do, `StoryDto.commentCount` is always 0 and no card or dialog shows a count ([Plan board](plan/plan-board/README.md)) | Comments on a story; nothing of journey 21 | |
| 98 | Editing the sprint, and more than one sprint. A Popkin has one sprint, "Planning sprint", from the day of its first story for 28 days, and nobody changes it (L2-068) ([Plan board](plan/plan-board/README.md)) | Nothing of journey 21 | |
| 99 | Contacts on Today: how long without talking puts someone under "It's been a while" (the mocks show 59 and 33 days, not 11 or 10); how far ahead "Coming up" looks and how many it shows; what "Last time:" quotes (L2-125) | Today (L2-125) | Settled 17 November 2026, every question in the row ruled. Ruled for People (2026-11-16): a contact is drifting when the last conversation logged was more than 30 days ago; People draws that "Last talked" quiet. Ruled for Today (2026-11-16): "It's been a while" holds at most five, most days first, and nobody with no conversation logged; "Coming up" takes four within 60 days after the next date; "Last time:" quotes the first sentence of the latest conversation's note ([Today](contacts/today/README.md#rulings-known-gaps-99-and-111-settled-2026-11-16)) |
| 100 | How a contact enters Closest and how many it holds; only "Take … out of Closest" is drawn (L2-126, L2-131) | People, More for a contact | Settled 17 November 2026, every question in the row ruled. Ruled for the profile (2026-11-16): "More for {first name}" offers "Add {first name} to Closest" ("{first name} shows first in People.") to a contact not in Closest and "Take {first name} out of Closest" to one in it (`PUT` and `DELETE /api/contacts/people/{id}/closest`, both `204` and idempotent). Closest has no limit of its own; People's strip scrolls. Closest is ordered by first name, A to Z |
| 101 | People's search: whole name or part, first or last name, and whether it keeps the chosen circle; when the next key date shows its date first ("Oct 7 · Birthday") or its kind first ("Birthday Apr 29"); when a profile's key date shows the days left (L2-126, L2-127, L2-128) | People, profile | Settled 17 November 2026, every question in the row ruled. Ruled for the profile (2026-11-16): a key date shows the days left when its next day is 30 days away or fewer: "today", "tomorrow", "in {n} days". People's search and its next-date order are ruled with People. Ruled for People (2026-11-16): the search matches any part of the name, ignoring case and accents, and keeps the chosen circle; a next key date 90 days away or fewer reads date first in bold ("Oct 7 · Birthday"), a later one kind first ("Birthday Apr 29") |
| 102 | A contact's fields: the length of each, the form of a phone and an email, whether a birthday keeps its year and what shows without it, where "How you met" is entered (the profile shows it; the form has no field), and the form's "Things they love" as one comma-separated field (L2-128, L2-129) | Add someone, Edit | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): a name is 1 to 40 characters, as a person's is; "How you know them" and "City" at most 60; at most 12 things they love, each at most 40, split at commas; a phone is kept as typed, 7 to 15 digits (as E.164 allows, since a contact may live anywhere) with spaces, a leading +, brackets, dashes and dots, at most 20 characters; an email has the shape sign-in checks, at most 254. A refusal is `contact_field_too_long`, `contact_phone_invalid` or `contact_email_invalid` naming its field. Ruled (2026-11-16): a birthday may be kept without its year, and then shows its day alone ("Jan 24") and no age; "How you met" is a field of Details, at most 120 characters (`contact_field_too_long`) |
| 103 | Key dates: how far ahead Dates looks (the mocks stop at December, leaving January's birthday out); changing a date's day once added; the kinds, since Add a date offers Birthday, Anniversary and Something else while Dates filters Milestones and lists a work anniversary; how a one-off date such as "Iris is one month old" arises (L2-137, L2-138) | Dates, Add a date | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): Dates lists the next occurrence of every key date, at most a year ahead, soonest first; a date's day is not changed once added (remove it and add it again); the kinds are Birthday, Anniversary, Milestone (from a remembered milestone) and Other ("Something else"), and "Milestones" shows Milestone and Other; a one-off date such as "Iris is one month old" is Something else with "Every year" off |
| 104 | Reminders: what a phone notification and the Monday email say, where the email goes for a person who signs in with a phone number, the time zone of "9 am", whether habits and follow-ups notify too, and how a promise's "Remind me {day}" reaches the person (L2-140) | Settled 17 November 2026, every question in the row ruled. Reminders; phone notifications and email need their providers (gap 1) || Settled 17 November 2026: Web Push for the phone ([ADR 0028](../adr/0028-phone-reminders-by-web-push.md)); 9 am in the zone the device last saved, UTC before one is; key dates, follow-ups on their due day and habits on their due day and the day after remind; the Monday email goes to the account's email from 9 am when the week holds a date, and none to a phone-only account ([Reminders](contacts/reminders/README.md#rulings-known-gaps-104-and-114-settled-2026-11-17)) |
| 105 | Habits: which day a weekly or monthly habit falls on, how "kept" and "{n} weeks running" are counted, and editing, pausing or ending a habit (L2-143, L2-145) ([Habits](contacts/habits/README.md)) | Habits, New habit | Settled 2026-11-16: periods counted back from the due day in steps of the rhythm, the latest holding today; kept when a day kept falls in it; the run counts kept periods in a row to the latest, shown from two (the mocks now read 10 weeks and 8 months); one habit per contact; "With" is a select from Habits or after "Change"; "End this habit" with Undo on the profile, no editing or pausing (L2-143 AC5–7, L2-144 AC3, L2-145 AC5–6) |
| 106 | Log and follow-ups: a conversation's title and length (the timeline shows them; the form has neither); changing "Today, 8:40 am"; the promise editor ("Add a promise or follow-up" is undrawn); what "Worth remembering" suggests; the person and day of a follow-up added on Follow-ups; editing and deleting a log entry or a follow-up (L2-133, L2-135, L2-141, L2-142) | Log, Follow-ups | Settled 17 November 2026, every question in the row ruled. Ruled for Follow-ups (2026-11-16): a follow-up added on Follow-ups is for nobody and has no day, listed last under "Later"; one added on a profile is for that contact; text is 1 to 200 characters; a follow-up is not edited or deleted, but ticked done, and goes with its contact. Ruled for Log (2026-11-16): a conversation has no title or length, and the timeline shows its channel and note; it is logged at the moment Log opened, which cannot be changed; the promise editor is the dialog Add a promise (text 1 to 200 characters, a day, tomorrow at first); Worth remembering offers Add a date alone; a milestone needs its kind, what happened (1 to 200) and when, and its photo is added as a memory; notes are up to 2,000 characters; no entry is edited or deleted, and entries go with their contact. Settled |
| 107 | Memories: the File and Note forms, the files accepted and their size, a note's length, and editing or deleting a memory (L2-136) | Memories | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): a file is a PDF, a Word document, a spreadsheet, plain text or a picture, up to 25 MB, its type read from its bytes; a note is 1 to 2,000 characters, dated the day it was added; a caption is up to 200 characters; a milestone's photo is a photo memory dated by the milestone, and if it fails the milestone stays saved and Save sends it again; photo memories are on the timeline under "All"; no memory is edited or deleted, and memories go with their contact. Settled |
| 108 | Groups: how a group is linked to a Popkin (the mock's "Thursday Night Group" has 4 people and the Popkin 9; "Tigers U9" against "Tigers U9 Parents"), renaming, deleting and taking people out of a group, and what a profile's group chip opens (L2-146, L2-148) | Groups, Open and Start a Popkin | Settled (2026-11-16): only "Start a Popkin with them" links a group; "Open" while the person is in the Popkin; invites from the contact's own phone or email, once; a group is kept as made, and people leave it from their Edit; a profile's chip opens `/contacts/groups/{groupId}` ([Groups](contacts/groups/README.md#rulings-known-gaps-108-and-116-settled-2026-11-16)) |
| 109 | Connections: whether a connection reads both ways and in whose words; how the line to "You" is made; how a promised introduction becomes a dotted line; which contacts the map leaves out; what "Connect two people" asks when no contact is chosen (L2-149, L2-150) | Connections, Connect | Settled: one row per pair in the owner's words, refused twice (409); the line to "You" from the circle; "Not introduced yet" draws it dotted; faces round an oval in the order first connected; "Connect two people" asks "Connect" first; removed in Add someone or Edit ([Connections](contacts/connections/README.md#rulings-known-gap-109-settled)). |
| 110 | Import and delete: what Import brings over (name, photo, phone, email?), whether wrapped-up Popkins and people already in Contacts are offered, and whether Import is offered again once Contacts has people; what deleting a contact does to their key dates, habit, connections and groups (L2-132, L2-151); how many contacts, groups and habits a person may keep; whether Contacts syncs between a person's devices beyond the offline queue (L2-123 AC4) | Import, Delete, Contacts' storage | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): a deleted contact takes its key dates, habit and kept periods, both ends of each connection and its group memberships, and every group and other contact stays ([Delete a contact](contacts/delete-contact/README.md)); Import brings the name only, offers every Popkin the owner has not left, wrapped up or not, and never imports a person already in Contacts ([Import from your Popkins](contacts/import-from-popkins/README.md)). Ruled (2026-11-16): a person may keep any number of contacts; People reads them all in one request. Ruled for sync (2026-11-16): Contacts does not push between a person's devices; a second device sees a change on its next read, and the outbox sends each offline write once, by its `clientId`. Ruled for Delete (2026-11-16): deleting a contact removes their key dates, habit and kept periods, both ends of each connection and their group memberships, and keeps every group and every other contact; erasing a deleted account removes every contact it kept. Settled for Import (2026-11-16): the name only; every Popkin not left, wrapped up or not; nobody already in Contacts; offered from the empty Today and People ([Import from your Popkins](contacts/import-from-popkins/README.md#rulings-known-gaps-110-and-117-settled-2026-11-16)) |
| 111 | Today, People and profile copy: how many entries "Recently" shows; when a day reads as a weekday ("Sun") or a date ("Sep 11"); the words for a badge of one follow-up; a People row with no conversation logged; who writes a key date's title ("Mum's birthday" by relation, "Grace's birthday" by name); what "Last time:" quotes, since "she asked you…" uses a pronoun (L2-122 AC4) unless it is the owner's own text; the loading and failure copy of a profile opened by its address before the name is known ([Today](contacts/today/README.md), [People](contacts/people/README.md)) | Today, People, profile | Settled 17 November 2026, every question in the row ruled. Ruled for the profile (2026-11-16): a profile opened before its name is known reads "Loading the profile…", and on failure "We couldn't load this profile" and "The timeline and notes are safe. Check your connection and try again.". Ruled for Today (2026-11-16): "Recently" shows five; an entry reads as "Last talked" does, the weekday within 6 days, else the date; a conversation is named by its channel and a milestone by its title; a key date's title and line are Dates' own; "Today", "Tomorrow" or "{weekday} · in {n} days"; "Message" and "Call" are left out with no phone ([Today](contacts/today/README.md#rulings-known-gaps-99-and-111-settled-2026-11-16)). Ruled for People (2026-11-16): "Last talked" reads "today", then the weekday ("Mon", "Sun") within the last 6 days, the date ("Sep 5") up to 30 days, then "{n} days ago"; a contact with no conversation logged reads "Not yet". People's line is "{n} people · only you can see them" |
| 112 | Add someone and Edit: changing or removing the photo in Edit; the toast after Add someone, which no requirement asks for, uses a pronoun and has an "Undo" that undoes nothing named; that the form reads the owner's groups before it shows, where the manifest says it needs no request; whether "Add "{name}"" fills in Name ([Add or edit someone](contacts/add-contact/README.md)) | Add someone, Edit | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): Edit changes the photo with the same picker as Add someone ("Change photo"); a photo is replaced, never removed. After Add someone the profile opens with the success toast "{first name} is in your Contacts." and no Undo (L2-122 AC4). "Add \"{name}\"" from People's search fills Name. The form reads the owner's groups as it opens and shows the part when they arrive (with Groups, row 108) |
| 113 | Key dates: a field for a date's line ("Hackney Town Hall, 2 pm", "Ben & Kate's daughter"); one date for two contacts ("Chidi & Tomás's anniversary"); what "For" starts with and "Change" opens when Add a date opens from Dates; the default lead time of "Something else"; the reminder day of "1 month before" and of 29 February in a year without it; how near a date is to show "in {n} days" ([Key dates](contacts/key-dates/README.md)) | Dates, Add a date | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): no line field: the line is the age or the years, when the year is known, and nothing otherwise; one contact per date; from Dates "For" is a select of the owner's people A to Z starting at "Choose someone", refused as "For: choose who the date is for."; Something else defaults to 1 week before; "1 month before" is the same day of the month before, or its last day; 29 February falls on 28 February in a year without it; Dates tints a date 14 days away or fewer and always reads "today", "tomorrow" or "in {n} days" |
| 114 | Reminders: which follow-ups the message names; the words for any date but a birthday whose year is known; the phone notification channel (Web Push, or SMS through Azure Communication Services), which needs its own ADR, and until it is accepted `NoPhoneNotificationSender` sends nothing; the Worker's new settings (`Communication:*`, `Addresses:BaseDomain`) and the fifth job in `JobCatalogue`, where L2-113 names four ([Reminders](contacts/reminders/README.md)) | Settled 17 November 2026, every question in the row ruled. Reminders, Jobs || Settled 17 November 2026: no follow-ups under a date's reminder; the words of each kind of date, "on {weekday}" within 6 days and "on {day} {month}" after; Web Push by ADR 0028, with nothing sent while no key is set; the Worker's settings in `docs/deployment.md`; the job registered in `Program.cs`, as `JobCatalogue` is not built ([Reminders](contacts/reminders/README.md#rulings-known-gaps-104-and-114-settled-2026-11-17)) |
| 115 | Follow-ups: where "This week" ends (Saturday in the mocks, or the device's week); whether "Follow-ups {n}" on a profile counts open follow-ups or all ([Follow-ups](contacts/follow-ups/README.md)) | Follow-ups, profile | Settled 17 November 2026, every question in the row ruled. Ruled for the profile (2026-11-16): "Follow-ups {n}" counts the open follow-ups and shows no number at none; the delete dialog counts them all. "This week" runs from tomorrow to the coming Saturday on the device's date, as the mocks draw it ([Follow-ups](contacts/follow-ups/README.md)) |
| 116 | Groups: choosing a group's emoji; the length of a group's name; the title of Add people for a group that has no name yet ([Groups](contacts/groups/README.md)) | Groups, New group | Settled (2026-11-16): the emoji follows the kind; the colour comes from the group's id; a name is at most 40 characters and a note 500; Add people reads "Add people to the group" before there is a name ([Groups](contacts/groups/README.md#rulings-known-gaps-108-and-116-settled-2026-11-16)) |
| 117 | Import and delete copy: a failed import, a candidate list that fails or loads, a way back after "Tick nobody", how many people show before "Show {n} more"; the delete sentence when a count is zero; what removes a stored file a delete failed to remove; what erasing an account does to the contacts others imported from it ([Import from your Popkins](contacts/import-from-popkins/README.md), [Delete a contact](contacts/delete-contact/README.md)) | Import, Delete | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): erasing an account leaves the contacts others imported from it as they are, with the link to the account (`Contact.PersonId`) cleared, so "Also in your Popkin" no longer shows; nobody is told. The delete sentence leaves out a count of zero; a file the store fails to delete is left behind and logged, with no sweep ([Delete a contact](contacts/delete-contact/README.md)). Settled for Import (2026-11-16): four per Popkin, then "Show {n} more"; "Tick everyone" once nobody is ticked; skeleton rows while loading; the failed-read, nobody-to-import and failed-import copy ([Import from your Popkins](contacts/import-from-popkins/README.md#rulings-known-gaps-110-and-117-settled-2026-11-16)) |
| 118 | Whether `ContactsOutbox` holds photos, so a milestone or memory photo taken offline waits like the rest ([Memories and files](contacts/memories/README.md)) | Offline Contacts | Settled 17 November 2026, every question in the row ruled. Ruled (2026-11-16): `ContactsOutbox` keeps a photo with its waiting write in memory, as `MessageOutbox` does; the write itself is kept in local storage. A reload while offline sends the write without its photo, which Edit can add |
| 119 | Whether the admin app's Features panel should say how many Popkins have a feature switched off by their Host: "On in all {n} live Popkins" counts what the admin app offers, not what each Host has on (L2-076 AC1, L2-153, [Choose a Popkin's features](popkins/choose-features/README.md), ADR 0026) | Admin Features | |
| 120 | Whether Import from your Popkins should open as every other dialog does. It opens with `{ ariaLabelledBy: 'dlg-title' }` alone, so it keeps the CDK's own backdrop and is not `aria-modal`, while every other dialog opens through `dialogConfig` (`api` library) with no CDK backdrop, because `pk-dialog` draws its own, and `ariaModal: true`. Both calls, in Today and People, say so and are left as they shipped ([Import from your Popkins](contacts/import-from-popkins/README.md)) | Import from your Popkins | |
| 121 | `DialogOpener`, which [WCAG 2.2 AA](accessibility/wcag-2-2-aa/README.md) and [Responsive layout](accessibility/responsive-layout/README.md) design as the components library's one way to open a dialog, is not built. Dialogs open through the CDK `Dialog` with `dialogConfig` (`api` library): `ariaLabelledBy: 'dlg-title'`, `hasBackdrop: false` because `pk-dialog` draws its own backdrop, `ariaModal: true`, and each dialog's own options at the call. The CDK's defaults give the designed `autoFocus: 'first-tabbable'`, `restoreFocus: true` and `closeOnNavigation: true`; no dialog sets the designed `role: 'alertdialog'` for a destructive confirmation | Accessibility of dialogs | |
| 120 | Why the code screen went back to sign in about 5 seconds after "Send my code" on desktop (issue #74). The app has no timer, request or guard that leaves the screen, so it is not reproduced; it needs the reporter's recording and the API log of that minute ([Confirm the code](accounts/confirm-code/README.md)) | The cause of #74 | |
| 122 | On a contact's profile at 360 px, Edit profile and More sit about 4 px further apart than the mock draws them (the head's actions, `contact-profile/default.html`); at 1280 px they match. The parity spec of `pk-cluster` compares the head at 1280 px only ([ADR 0029](../adr/0029-one-library-no-unused-components.md)) | None; found when `pk-cluster` was built | |
| 123 | "Plans coming up": the notification designs draw an event with a time, a place and members going, maybe or not, answered from the email ("I'm going", "Can't make it"). Popkin has no such thing; the kind is left out of L2-154 until an event has its own requirement and mocks (owner, 2026-11-17) | Notifications; Plan | |
| 124 | Acting from an email: replying by email into a chat ("or just reply to this email") and one-tap actions ("Mark it done", "I'm going") need inbound mail or signed action links. Ruled out for now: every button opens Popkin (L2-163 AC6; owner, 2026-11-17) | Notification emails | |
| 125 | Holding one person's notifications by hand: the admin designs list such a hold ("Asked support to stop all mail while travelling", until a date) but draw no way to add one; only a Popkin is held by hand (L2-172) | Admin Notifications | |
| 126 | The Monday email is withdrawn (L2-140, changed 2026-11-17), which reverses part of gap 104's ruling: `ReminderPreferences.PhoneNotifications` and `MondayEmail`, the Dates switches, the Monday job and their tests are to be removed, and phone alerts move under the "Birthdays" kind (L2-154, L2-157). Reminders now go at 8 am, not 9 am | Contacts reminders; Notifications | |
| 127 | The notification designs' sender `notify@popk.in` and the footer's postal address: the requirement keeps the sender on `popkin.community` (ADR 0021) and reads the address from configuration (`Email:PostalAddress`, L2-163 AC5); the address itself is not supplied | Notification emails; first deployment of them | |
| 128 | How notification emails are built: the template technology (Razor components rendered with `HtmlRenderer`, or another), and email-safe markup (tables and inline styles) from the email mocks (L2-163) | Notification emails | [ADR 0030](../adr/0030-notification-emails-by-razor-components.md): Razor components rendered with `HtmlRenderer`, tables and inline styles. Closed |
| 129 | How "Opened" and "bounced" are counted (L2-169): Azure Communication Services engagement tracking and delivery reports reach Popkin through Event Grid, which adds an endpoint and a subscription; opens are kept per kind and day only (L2-174 AC6) | Admin Notifications | |
| 130 | "Seen before it is sent" (L2-161 AC9): only chat has a read state (`ThreadReadState`); a photo, a story change or a member joining has none, so those are always sent | Deliver notifications | |
| 131 | @mentions: chat has no mention (no requirement or mock defines one), so "Mentions and replies" (L2-154) comes from replies alone until a mention is specified ([Deliver notifications](notifications/deliver-notifications/README.md)) | Notifications; Chat | |
| 132 | The unsubscribe page (L2-168 AC3, AC5): no mock draws `/unsubscribe` unsubscribed or expired; a mock comes before it is built ([Unsubscribe](notifications/unsubscribe/README.md)) | Unsubscribe |Settled 17 November 2026: `docs/mocks/pages/unsubscribe/` draws default (unsubscribed), working, expired and error |
| 133 | A Data Protection key ring shared by the API and the Worker, so a token the Worker puts in an email is read by the API (proposed: Blob Storage with Key Vault, `DataProtection:*` settings); needs its own ADR | Unsubscribe; first deployment of notifications |Settled 17 November 2026 by [ADR 0031](../adr/0031-one-data-protection-key-ring-in-blob-storage.md) |
| 134 | The phone alert's 10-second median (L2-175 AC1) against a 15-second dispatcher tick, which spends about 7.5 seconds of it on average: a shorter tick for phone alerts, or a dispatch started by the API's commit | Deliver notifications | |
| 135 | Lead times: Notifications › People offers five (L2-159 AC1) while Dates offers six, with "1 month before" (L2-139 AC1); the design shows the sixth only on a birthday that already has it ([Birthday reminders by person](notifications/birthday-reminders-by-person/README.md)) | Birthday reminders by person | |
| 136 | Notifications screen states no mock draws: a member of no active Popkin on "Popkins"; "Mute someone" finding nobody; a muted person who no longer shares a Popkin; the account with no email address (L2-156 AC5); whether a banner closes by itself after 8 seconds, as the mock's note says ([Notification settings](notifications/notification-settings/README.md)) | Notification settings | |
| 137 | Admin notification mocks still to draw: the dialog that holds a Popkin with a reason (`notification-hold-add`), the dialog that saves the defaults with a reason (`notification-defaults-save`), and the Defaults tab's invalid, saved, loading and error states; the drawn dialogs mark the reason optional where L2-087 AC1 now asks for one ([Notification holds](admin-platform/notification-holds/README.md), [Notification defaults](admin-platform/notification-defaults/README.md)) | Admin Notifications | |
| 138 | Three admin notification details the designs left open. L2-087 AC1 already names the notification dialogs (the designs say it does not), so the reason is required in all six. Focus starts in the reason (L2-087 AC1), not on the safe choice as the mocks' note said. The release dialog is titled "Release the hold on {name}?", as the mock and design draw it, where L2-172 AC4 says "Release this hold?"; whether L2-172 AC4 takes the mock's words is `<TO SUPPLY>` by its owner | Admin Notifications | |

Settled so far:

| Decision | Settled by |
|---|---|
| The words of a switched-off admin action | [Admin roles](admin-access/admin-roles/README.md), built in journey 24: "Viewer admins can’t do this" for a Viewer and "Only Owners can do this" otherwise. The people designs' "Support admins can’t do this" (from their mocks) gives way to it |
| How a switched-off admin action is drawn | [Admin roles](admin-access/admin-roles/README.md), built in journey 24: `aria-disabled`, still focusable, ignoring activation, with the reason as its `title` (tooltip and accessible description) |
| How many API instances run | [ADR 0009](../adr/0009-one-api-instance.md): one |
| What the event of time off is, and who sets it | [Set the event](schedules/set-the-event/README.md): a label and a first and last day the Host sets from Popkin settings (L2-085), journey 22 |
| How Plan keeps the points left of each day, and how Plan is switched | [Plan board](plan/plan-board/README.md): an append-only log, `PlanChange`, summed to the end of any day, with no job; [Plan switch](plan/plan-switch/README.md): `Features:Plan` behind `IFeatureSwitches` |
| How Schedules is switched before the admin app exists | [Schedules switch](schedules/schedules-switch/README.md): the API setting `Features:Schedules` behind `IFeatureSwitches` ([ADR 0023](../adr/0023-features-switched-on-by-a-setting.md)); journey 23 moves it into the admin app behind the same interface |
| Whose clock counts a day of the Schedule tab | [Time off](schedules/time-off/README.md): a day is a calendar date, the same for every member, and "today" is the viewer's, sent by the web app |
| Whether TLS ends at a reverse proxy, and who serves the web app | [ADR 0013](../adr/0013-deployment-shape.md): the proxy does both |
| The logging sink | [ADR 0012](../adr/0012-opentelemetry.md): OpenTelemetry, exported over OTLP |
| The SignalR client package | Shared real-time rules above: `@microsoft/signalr` from npm, on the server's release line |
| Reconnect delays and the disconnect grace period | [Live messages](chat/live-messages/README.md) and [Group call](calls/group-call/README.md) |
| The admin notification mocks gap 137 listed | `docs/mocks/admin/dialogs/notification-hold-add/`, `notification-defaults-save/`, the `invalid` state of the four other dialogs and the Defaults tab's `defaults-edited`, `defaults-invalid`, `defaults-saved`, `defaults-loading` and `defaults-error` (17 November 2026) |
| How the admin Notifications page runs before its backend | [ADR 0030](../adr/0030-admin-notifications-on-a-fake-backend.md): a fake interceptor in the `api` library, off in e2e |
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
