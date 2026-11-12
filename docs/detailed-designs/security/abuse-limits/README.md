# Abuse limits

## Overview

Popkin is free and needs no password, so its most exposed operations cost nothing to call: asking
for a six-digit code, guessing an invite code and sending messages. Without limits, one person
could flood a phone with codes, enumerate invite codes or drown a chat. This feature is the
mechanism that caps those three operations per address or per member, and tells the person when
they can try again. It has no screen of its own; it shows through a toast.

**rate limit** — maximum number of requests of one kind that one partition may make in one
window

**partition** — the key a rate limit counts by: the client address or the member

**client address** — IP address of the person's device as seen by the Popkin API after the
trusted reverse proxy, `<TO SUPPLY>`, has forwarded it

**retry delay** — number of seconds until the partition may try again, sent in the `Retry-After`
header

The limits come from L2-053:

| Policy | Partition | Limit | Window |
|--------|-----------|-------|--------|
| Code requests | client address | 10 | 10 minutes |
| Messages | member (person in one Popkin) | 60 | 1 minute |
| Invite codes tried | client address | 20 | 10 minutes |

These limits sit beside the per-destination limits of L2-005 (five codes per phone number or
email per hour, five wrong attempts per code). Those are counted in the database by
[Confirm the code](../../accounts/confirm-code/README.md) and are not repeated here.

## Description

### Screens and states

- `docs/mocks/notifications/toast/warning.html` — over the Everyone thread, a warning toast "Slow
  down a little" with "You can send again in 30 seconds." (L2-053 AC2, AC4). L2-053 AC2 says the
  composer says to slow down; the mock places that message in a toast above the composer, and the
  design follows the mock.
- `docs/mocks/pages/verify-code/default.html` and `docs/mocks/pages/join-code/default.html` — the
  screens that send code requests and invite codes. Their rate-limited state is not drawn; the
  design shows the same warning toast there with the retry delay. A dedicated mock state is
  `<TO SUPPLY>` if the toast is not the intended treatment.

### API

The mechanism adds no endpoint. A refused request answers:

- `429` `rate_limited` — ProblemDetails with `code: "rate_limited"` and the extension
  `retryAfterSeconds`, plus the header `Retry-After: <seconds>` (L2-053 AC1, AC4).

Policies apply to these endpoints, whose exact paths belong to the designs named:

| Policy | Endpoints |
|--------|-----------|
| `codes` | the sign-up, sign-in and resend endpoints under `/api/auth` that send a code ([Sign up](../../accounts/sign-up/README.md), [Sign in](../../accounts/sign-in/README.md), [Confirm the code](../../accounts/confirm-code/README.md)) |
| `messages` | `POST /api/popkins/{popkinId}/threads/{threadId}/messages` ([Send a message to everyone](../../chat/send-message-to-everyone/README.md), [Direct messages](../../chat/direct-messages/README.md)) |
| `invite-codes` | `GET /api/invites/{code}` and `POST /api/invites/{code}/join` ([Preview an invite](../../invitations/preview-invite/README.md), [Join by code](../../invitations/join-by-code/README.md)) |

### Backend — Popkin API

- **`RateLimitPolicyNames`** (`Popkin.Api/RateLimiting/`) — introduced static class of constant
  policy names: `Codes = "codes"`, `Messages = "messages"`, `InviteCodes = "invite-codes"`. The
  shared architecture names this `IRateLimitPolicy`; a static class of constants is the .NET
  convention for policy names, so the design uses it instead.
- **`RateLimitingSetup.AddPopkinRateLimiting(IServiceCollection)`** — introduced extension called
  from `Program.cs`. It configures `AddRateLimiter` with three policies:
  - `codes` — `FixedWindowRateLimiter`, `PermitLimit = 10`, `Window = 10 min`, `QueueLimit = 0`,
    partitioned by client address (L2-053 AC1).
  - `messages` — `SlidingWindowRateLimiter`, `PermitLimit = 60`, `Window = 1 min`,
    `SegmentsPerWindow = 6`, `QueueLimit = 0`, partitioned by `{personId}:{popkinId}` from the
    session's claims and the route (L2-053 AC2). A sliding window stops a burst of 120 messages
    across the boundary of two fixed windows.
  - `invite-codes` — `FixedWindowRateLimiter`, `PermitLimit = 20`, `Window = 10 min`,
    `QueueLimit = 0`, partitioned by client address (L2-053 AC3).
  Values live in configuration under `RateLimits:*` with these defaults, so operations can tune
  them without a build.
- **`OnRejected`** — sets status `429`, reads `MetadataName.RetryAfter` from the lease, writes the
  `Retry-After` header in whole seconds rounded up, and writes the ProblemDetails above through
  `IProblemDetailsService`. It logs the policy name and partition kind, never the address or the
  person id in clear (see [Personal data protection](../personal-data-protection/README.md)).
- **Controllers** — the actions above carry
  `[EnableRateLimiting(RateLimitPolicyNames.Codes)]`, `…Messages` and `…InviteCodes`.
- **Pipeline order** — `UseRateLimiter()` runs after `UseRouting()` (so endpoint metadata is known)
  and after `UseAuthentication()` (so the `messages` partition can read the person id), and before
  `UseAuthorization()`. `UseForwardedHeaders()` runs first, with the reverse proxy as the only
  known proxy, so a client cannot choose its own address through `X-Forwarded-For`.
- **Scale-out** — ASP.NET Core's limiters count in process memory. With more than one Popkin API
  instance, each counts alone and the effective limit multiplies. The instance count and, if it
  is more than one, a shared counter store are `<TO SUPPLY>`.
- **Real-time messages** — messages are sent over HTTP, not through `PopkinHub`, so the
  `messages` policy covers every message. Should a hub method ever accept messages, it applies
  the same limiter through `PartitionedRateLimiter` in the hub filter.

### Frontend — Popkin web app

- **`rateLimitInterceptor`** (`frontend/projects/api/src/lib/api/rate-limit.interceptor.ts`) —
  introduced `HttpInterceptorFn`. On a `429` it turns the response into a `RateLimitedError`
  carrying `retryAfterSeconds` (from the header, else from the body).
- **`formatRetryAfter(seconds: number): string`** (`frontend/projects/api/src/lib/api/`) —
  introduced pure helper: "in 30 seconds", "in 1 minute", "in 9 minutes", rounding up to whole
  minutes from 60 seconds (L2-053 AC4).
- **`Toaster`** (`frontend/projects/popkin/src/app/toasts/`) — shows `pk-toast` (warning) with the
  title "Slow down a little" and the line "You can send again {formatRetryAfter}." for messages.
  The title and line for code requests and invite codes are `<TO SUPPLY>`. A warning toast stays
  until dismissed (L2-056 AC7 treats it as a failure message).
- **`GroupChatPage`** and **`DirectMessagePage`** — keep the text in the composer on a `429`, so
  nothing typed is lost, and disable Send until the retry delay has passed.
- **`VerifyCodePage`**, **`SignUpPage`**, **`SignInPage`** and **`JoinCodePage`** — show the toast
  and disable the submitting action until the retry delay has passed.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-053` | `L1-012` | Abuse is limited: One person cannot flood the system or another person. |

## Diagrams

### System context

A person, signed in or not, calls Popkin; Popkin refuses calls beyond the limits before they
reach the SMS or email provider or the database.

![C4 system context for abuse limits](diagrams/c4-context.png)

### Containers

The rate limiter runs inside the Popkin API, in front of the controllers; the web app explains a
refusal with a toast.

![C4 container view for abuse limits](diagrams/c4-container.png)

### Components

`UseForwardedHeaders` fixes the client address, the authentication middleware identifies the
member, and the rate limiter middleware applies the endpoint's policy before any controller runs.

![C4 component view for abuse limits](diagrams/c4-component.png)

### Class structure

`RateLimitingSetup` builds the three policies named in `RateLimitPolicyNames`; the web app's
interceptor produces `RateLimitedError` and `formatRetryAfter` words the delay.

![Class diagram for abuse limits](diagrams/class-structure.png)

### Behaviour — the 61st message in a minute

A representative request, a message from a member who has sent 60 in the last minute, is refused
with `429` and `Retry-After`; the toast says when to try again (L2-053 AC2, AC4).

![Sequence diagram for the message limit](diagrams/sequence-message-limit.png)

### Behaviour — the 11th code request from one address

Code requests beyond 10 in 10 minutes from one address are refused before any code is sent
(L2-053 AC1); invite codes follow the same path with their own policy (L2-053 AC3).

![Sequence diagram for the code request limit](diagrams/sequence-code-limit.png)
