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
  `PopkinHub` at `/hubs/popkin` for live updates and call signalling.
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

Shared names used across the designs:

- `IMembershipGuard` (`RequireMemberAsync`, `RequireActiveMemberAsync`, `RequireHostAsync`) is
  defined in [Membership authorisation](security/membership-authorisation/README.md).
- ProblemDetails codes shared by every write: `404` `popkin_not_found`, `403` `host_only`, `409`
  `popkin_wrapped_up`, `429` `rate_limited`.
- Rate-limiter policy names live in `RateLimitPolicyNames`
  ([Abuse limits](security/abuse-limits/README.md)).
- The session cookie is `__Host-popkin`, `Secure`, `HttpOnly` and `SameSite=Strict`. The
  scaffold sets `Lax` today; [Sessions](accounts/sessions/README.md) gives the reason for the
  change (L2-007 AC4).
- Routes follow the mock manifest. A direct message is `/p/:popkinId/chat/:memberId` and the
  welcome screen is `/i/:code/welcome`.

## Conflicts between the mocks and the specs

Each design follows the source named below and marks the conflict in its own README.

- The reactions dialog shows six quick reactions, while L2-024 asks for five
  ([React to a message](chat/react-to-message/README.md)).
- The score bars scale to the largest count, while L2-038 AC2 asks for each value's share
  ([View an experience](experiences/view-experience/README.md)). The design follows the mock.
- The album thumbnails carry empty `alt` text, while L2-032 AC7 names the text
  ([Browse the album](photos/browse-album/README.md)). The design follows the requirement.
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
| Popkins | [Start a Popkin](popkins/start-popkin/README.md) | L2-008, L2-009, L2-010 |
| Popkins | [My Popkins](popkins/my-popkins/README.md) | L2-017, L2-018 |
| Popkins | [Popkin home](popkins/popkin-home/README.md) | L2-019 |
| Popkins | [Popkin settings](popkins/popkin-settings/README.md) | L2-020 |
| Popkins | [Leave a Popkin](popkins/leave-popkin/README.md) | L2-047 |
| Invitations | [Invite people](invitations/invite-people/README.md) | L2-011 |
| Invitations | [Preview an invite](invitations/preview-invite/README.md) | L2-012, L2-016 |
| Invitations | [Join a Popkin](invitations/join-popkin/README.md) | L2-013, L2-014 |
| Invitations | [Join by code](invitations/join-by-code/README.md) | L2-015 |
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
| Reliability | [Fast screens](reliability/fast-screens/README.md) | L2-055 |
| Reliability | [Loading, failure and offline](reliability/loading-failure-offline/README.md) | L2-056 |
| Accessibility | [WCAG 2.2 AA](accessibility/wcag-2-2-aa/README.md) | L2-057 |
| Accessibility | [Responsive layout](accessibility/responsive-layout/README.md) | L2-058 |
| Accessibility | [Light and dark themes](accessibility/light-and-dark-themes/README.md) | L2-059 |
| Accessibility | [Optional motion](accessibility/optional-motion/README.md) | L2-060 |

Every L2 requirement from L2-001 to L2-061 is realised by at least one feature above.

## Diagrams

Each feature's `diagrams/` folder holds PlantUML sources (`.puml`) and their rendered images
(`.png`). Render the tree after changing a source:

```sh
python .claude/skills/writing-software-design-documents/scripts/render_puml.py docs/detailed-designs
```

The script needs PlantUML and Graphviz on the machine.
