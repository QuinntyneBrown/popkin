# Learnings from BombRMan

13 November 2026

This document lists the improvements Popkin can make from what the BombRMan repository does well
and from what it gets wrong. It changes nothing by itself: each improvement names what it needs
(a code change, an ADR, or a requirement and a design) under the rules of
[`AGENTS.md`](../../AGENTS.md).

- BombRMan was read at commit `6d530c5` (the whole repository at
  `/Users/quinntynebrown/projects/BombRMan`, not only `BombRMan.Core`).
- Popkin was read at commit `6f21718` on the branch `responsive-mocks`.
- BombRMan paths below are relative to the BombRMan repository; Popkin paths are relative to this
  one.
- Nothing in either repository was built or run for this document. One claim depends on that and
  says so (the BombRMan container image, in [What not to copy](#what-not-to-copy)).

## Contents

- [Why BombRMan is worth reading](#why-bombrman-is-worth-reading)
- [Summary](#summary)
- [Real time: the hub](#real-time-the-hub) (1 to 9)
- [Background work: the Worker](#background-work-the-worker) (10 to 11)
- [Testing](#testing) (12 to 16)
- [Observability](#observability) (17 to 19)
- [Delivery and local development](#delivery-and-local-development) (20 to 25)
- [Documentation](#documentation) (26 to 27)
- [What not to copy](#what-not-to-copy)
- [What Popkin already does better](#what-popkin-already-does-better)
- [Suggested order](#suggested-order)

## Why BombRMan is worth reading

BombRMan is a multiplayer Bomberman clone: one ASP.NET Core process on .NET 10 that hosts a
SignalR hub, a server-authoritative game loop and a static JavaScript client. It is a game, and
Popkin is not, so its rules do not transfer. Three things do:

1. **It has built what Popkin has only designed.** Popkin's chat, calls, photos, experiences and
   wrap-up subsystems are at 0 % ([estimates](../estimates/README.md)), and four of them depend on
   a SignalR hub, `PopkinHub`, that does not exist yet. BombRMan has a working hub, has met the
   ordering, reconnect and flaky-test problems that come with one, and its history records each
   fix.
2. **It runs a background loop in production code.** Popkin's Worker hosts nothing yet; its first
   job, `WrapUpDuePopkinsJob`, is designed
   ([time is up](../detailed-designs/wrap-up/time-is-up/README.md)).
3. **It was recently made operable**: CI, a container image, an Aspire AppHost, OpenTelemetry, a
   diagnostics endpoint and an architecture document, one milestone each (pull requests #18 to
   #29). Popkin has CI and far stronger engineering rules, but no telemetry, no image and no
   deployment document.

Popkin is the more disciplined codebase. Most of what follows is about the parts Popkin has not
reached yet, so that it reaches them with BombRMan's lessons already applied.

## Summary

"Needs" says what the rules require before the change: **code** is a change with no new
production behaviour; **design** is an edit to an existing detailed design; **ADR** is a new
architecture decision; **requirement** means a new or changed L2 requirement, with its design and
mock, before any production code.

| # | Improvement | When | Needs |
|---|---|---|---|
| 1 | Keep `PopkinHub` a transport; rules stay in handlers | With the hub (journey 3) | `AGENTS.md` wording |
| 2 | Give every hub event a stated recovery read | With the hub | design |
| 3 | Make hub events tolerate reordering | With the hub | design |
| 4 | Coalesce state, never edges | Journeys 3 and 7 | design |
| 5 | Bound, validate and limit what the hub accepts | Journey 7 | design |
| 6 | Settle the disconnect grace and reconnect values | Journeys 3 and 7 | design |
| 7 | Type the hub contract on both sides | With the hub | code |
| 8 | Record the single-instance assumption | Before the hub | ADR |
| 9 | Close the hub gaps in the dev proxy and the e2e rule | Before the hub | ADR 0005 amendment, code |
| 10 | Keep the Worker job thin and its clock injectable | Journey 9 | design |
| 11 | Give the Worker loop a visible heartbeat and a clean stop | Journey 9 | design |
| 12 | Add hub integration tests on `ApiFactory` | With the hub | code |
| 13 | Wait on events in tests, never on the clock | With the hub | `AGENTS.md` wording |
| 14 | Test dense rules directly, beside the acceptance tests | As rules arrive | code |
| 15 | Decide how pure frontend logic is tested | Before journey 3 | ADR |
| 16 | Run every check in CI that the README names | Now | code |
| 17 | Add the request logging the rules already require | Now | code |
| 18 | Adopt OpenTelemetry for logs, metrics and traces | Before first deployment | ADR |
| 19 | Measure the promises the requirements make | With each feature | design |
| 20 | Split liveness from readiness | Before first deployment | requirement (small) |
| 21 | Build a container image and write the deployment document | Before first deployment | ADR |
| 22 | Trust the proxy's forwarded headers | Before first deployment | design, code |
| 23 | Start everything with one command | When the Worker has a job | ADR |
| 24 | Take the SignalR client from npm, pinned to the server | With the hub | design |
| 25 | Keep backend test results from CI | Now | code |
| 26 | Bring `AGENTS.md` back in line with the repository | Now | docs |
| 27 | Keep one register of known gaps | Now | docs |

## Real time: the hub

Popkin's designs place a great deal on one connection: messages, reactions, read state, presence
([live messages](../detailed-designs/chat/live-messages/README.md)), call state and WebRTC
signalling ([group call](../detailed-designs/calls/group-call/README.md)), photos, settings and
wrap-up events. BombRMan's hub carries less, and still needed several fixes after it first
worked.

### 1. Keep `PopkinHub` a transport; rules stay in handlers

**BombRMan.** `BombRMan.Core/Hubs/GameServer.cs` is 53 lines with no rule in it: it forwards
`SendKeys` to `GameState` and sends snapshots on connect. The rules sit in static, side-effect-free
classes (`BombLogic.cs`, `ExplosionCalculator.cs`) that 37 tests exercise without a hub, a host or
a thread. `ARCHITECTURE.md` states this as the intent ("intentionally thin").

**Popkin.** `AGENTS.md` says "Business rules live in handlers/domain services, not controllers."
It does not mention hubs, because none exists. The group-call design gives the hub two client
methods (`JoinCall`, `SendSignal`) and a disconnect path that issues `LeaveCallCommand`, so the
hub is about to hold decisions: who may join a call group, who may signal whom.

**Improvement.** Extend the rule to read "not controllers or hubs", and build `PopkinHub` to it:
each hub method checks nothing itself and sends one MediatR request (`JoinCallGroupCommand`,
`RelaySignalCommand`), exactly as a controller does. The membership and participant checks then
have one home, `IMembershipGuard`, and are tested the same way for HTTP and for the hub.

### 2. Give every hub event a stated recovery read

**BombRMan.** A client that connects mid-round is sent the whole current state before any delta:
the map as it stands, every player, then the bombs, explosions and power-ups in flight, then the
round state (`GameServer.cs:14-39`). Reconnecting is the same path as connecting. This was a bug
first: commit `01474b8`, "Sync round state for reconnecting clients", added the round state after
clients were found stuck on a stale one.

**Popkin.** The live-messages design has a catch-up, and it is good for what it covers:
`ThreadStore.catchUp()` fetches messages `after` the newest one shown, and `UnreadTracker` reloads
its counts. But the hub carries more than new messages, and a catch-up keyed on "newer than what
I show" cannot see changes to what is already shown:

| Event | Missed while disconnected | Recovery read today |
|---|---|---|
| `MessageAdded` | New messages | `?after={id}`, designed |
| `MessageDeleted` | A message on screen was deleted | None: `after` does not return it |
| `ReactionsChanged` | Reactions on a message on screen | None |
| `ThreadRead` | Read on another device | Count reload, designed |
| `PresenceChanged` | "5 here now" | Not stated |
| `CallChanged`, `CallEnded` | The call banner is stale or should be gone | `GET …/calls/current` exists; not tied to reconnect |
| `PhotoAdded` | New photos | Not stated here |
| `popkinWrappedUp` | The Popkin ended; the screen should be the recap | Not stated |
| `popkinLengthChanged` | The time left is wrong | Not stated |

**Improvement.** Adopt BombRMan's rule as a design rule: *an event is a hint that the state
changed, never the only way to learn it.* Each design that adds an event names the read that
recovers it, and `PopkinRealtime.reconnected$` triggers that read. For messages on screen, the
simplest recovery is to re-fetch the loaded window, not only what is newer. Add the table above,
completed, to the live-messages design.

### 3. Make hub events tolerate reordering

**BombRMan.** State that is replaced every tick is sent without waiting
(`_ = …SendAsync("updatePlayerState", …)`, `GameState.cs:435`). Lifecycle events are not: a
client was seen to receive `roundReset` before the `roundOver` that preceded it, and commit
`825c1ed`, "Serialize round reset broadcasts", chained every lifecycle send behind the previous
one (`GameState.cs:690-710`), with a regression test (`f81c1b4`, "Cover hosted round-over
ordering").

**Popkin.** The send handler "notifies after `SaveChangesAsync` inside the same request; there is
no queue between store and push". Two requests that commit in one order can therefore push in the
other. For `MessageAdded` that is harmless, because the client orders by `(SentAt, Id)`. For
others it is not:

- `CallChanged` carries a participant count. Two joins that push out of order leave every banner
  showing the older count until the next change.
- `CallEnded` followed by a late `CallChanged` brings a banner back for a call that is over.
- `MessageDeleted` that overtakes its own `MessageAdded` leaves a deleted message on screen.

BombRMan could serialise its sends because one thread produces them. Popkin's come from
concurrent requests, so the same fix does not apply; the client has to be able to tell old from
new.

**Improvement.** Sort the events into two kinds in the design, and treat each kind one way:

- **State events** (`CallChanged`, `PresenceChanged`, `popkinLengthChanged`, `ReactionsChanged`)
  carry the full current value and a version that only rises (a row version or a counter on the
  aggregate). The client keeps the highest version it has seen and drops anything older.
- **Fact events** (`MessageAdded`, `MessageDeleted`, `CallEnded`, `popkinWrappedUp`) are final and
  idempotent: applying one twice, or applying it before the fact it refers to arrives, ends in
  the same state. `ThreadStore` already does this for duplicates through `ClientMessageId`; it
  needs the same for a delete that arrives first (remember the id, drop the add).

### 4. Coalesce state, never edges

**BombRMan.** `PlayerInputBuffer.cs` keeps only the newest input per connection and rejects any
whose id is not above the last accepted one (`TryAccept`, lines 23-42). A burst of thirty key
states costs one update. This is right for "which keys are held", which each new state replaces.
It is wrong for a key *press*, which is an edge: the bomb key is detected on its rising edge
(`GameState.cs:450-457`), so a press followed quickly by another input is overwritten before the
loop reads it and the bomb is never placed. The project met this as a flaky test and worked
around it in the test (`GameServerIntegrationTests.cs:188-197`, commit `6d530c5`); the loss is
still in the product.

**Popkin.** The same split exists in Popkin's designs, unlabelled:

- Replaceable state: presence counts, microphone and camera state on a call, the read point.
  `ThreadReadState.Advance` already "never moves the read point backwards", which is BombRMan's
  stale-id rule and is correct.
- Edges that must each arrive: every message, and every WebRTC `offer`, `answer` and ICE
  `candidate` relayed by `SendSignal`. Dropping one candidate can leave a call that never
  connects.

**Improvement.** State the split in the call-controls and group-call designs. Mic and camera
toggles may be coalesced and sent as "state is now X" with a version (improvement 3). Signals may
never be coalesced, deduplicated by content or dropped under load; if a limit is hit
(improvement 5), the call fails visibly. Take BombRMan's flaky test as the warning: a lost edge
looks like an intermittent failure for a long time before anyone finds the cause.

### 5. Bound, validate and limit what the hub accepts

**BombRMan.** The hub's one inbound message has a hand-written reader that refuses more than 64
inputs in a batch and more than 8 key words in an input, and throws `InvalidDataException` on
anything malformed, returning its pooled buffers on the way out
(`KeyboardStateConverter.cs:10-11`, `:26-29`, `:57`, `:66`, `:88-97`). Detailed hub errors are on in
Development only (`Program.cs:9`). The client uses `send`, not `invoke`, for fire-and-forget
input (commit `0ed09c5`).

**Popkin.** `SendSignal(callId, toMembershipId, signal)` relays an opaque payload from one member
to another. The abuse-limits design covers messages because they travel over HTTP, and says a hub
method that "ever accept[s] messages" would apply the same limiter; it does not count signals. As
designed, a member on a call has an unlimited, unvalidated channel to another member's browser.

**Improvement.** In the group-call design:

- Validate `CallSignalDto` in a validator, as every command is: `type` is one of three values, and
  the payload has a maximum length chosen from real SDP sizes.
- Set the hub's maximum receive size deliberately (SignalR's default is 32 KB) and record why.
- Add a per-connection limit on `SendSignal` to the abuse-limits design, sized well above what a
  call set-up needs.
- Keep detailed hub errors off outside Development, and give hub failures the same `code` values
  as ProblemDetails so the client branches on one vocabulary (L2-052 AC5).
- Use `invoke` where the caller needs the outcome (`JoinCall`) and `send` where it does not.

### 6. Settle the disconnect grace and reconnect values

**BombRMan.** A dropped connection frees the player's slot at once (`GameState.cs:284-296`), and
the client never reconnects: it calls `start()` once (`wwwroot/js/game.js:396`) with no
`withAutomaticReconnect` and no `onclose` handler. A two-second loss of signal ends the player's
game until they reload the page. The server-side reconnect sync of improvement 2 is therefore
reachable only by a reload.

**Popkin.** The designs see the problem and leave the numbers open: the reconnect delays ("design
value 0, 2, 10 and 30 s") and the grace period before a dropped call participant is removed are
both `<TO SUPPLY>`. Popkin's people are "at a campsite, on a trail, in a basement venue"
([failed messages](../detailed-designs/chat/failed-messages/README.md)), so short drops are the
normal case.

**Improvement.** Supply both values before journey 7, and make the grace period longer than the
first two reconnect delays together, or a call participant is removed by the server while their
client is still inside its own retry window. Presence needs the same grace, or "here now" flickers
with every tunnel. Test the grace with the fake clock (improvement 13).

### 7. Type the hub contract on both sides

**BombRMan.** Every event is a string in two places: `SendAsync("updatePlayerState", …)` on the
server and `.on('updatePlayerState', …)` in the client, eighteen names in all, with anonymous and
private payload classes (`GameState.cs:725-756`). The tests redeclare each payload a third time
as private "snapshot" classes (`GameServerIntegrationTests.cs:392-436`). A renamed event compiles
and fails silently.

**Popkin.** The designs already disagree on casing: live-messages lists `MessageAdded` and
`PresenceChanged`; time-is-up lists `popkinWrappedUp` and `popkinLengthChanged`.

**Improvement.** Declare the hub as `Hub<IPopkinClient>`, with one interface method per event and
DTOs from `Popkin.Application`, so the compiler checks every send. In the `api` library, keep the
event names in one typed map that `SignalRPopkinRealtime` alone reads. Pick one casing in the
live-messages design and correct the others.

### 8. Record the single-instance assumption

**BombRMan.** `ARCHITECTURE.md` names it under "Known gaps": one process, one game state, and a
SignalR backplane as the step that scale-out would need.

**Popkin.** The same assumption is spread over several designs and code, none of which states it
for the system: `PresenceTracker` is in-process (a backplane is `<TO SUPPLY>`), SignalR groups are
in-process, and the rate limiter in `backend/src/Popkin.Api/RateLimiting/RateLimitPolicyNames.cs`
counts in memory, so two instances allow twice the codes of L2-053 AC1.

**Improvement.** Write an ADR that says Popkin runs one API instance, lists what depends on that
(groups, presence, rate limits, the call-participant connection id), and names what would end it:
a SignalR backplane, a shared presence store and a distributed limiter. Then the deployment
document (improvement 21) can say "one instance" with a reason, and nobody scales it out by
accident.

### 9. Close the hub gaps in the dev proxy and the e2e rule

Neither is a BombRMan lesson directly; both were found by tracing BombRMan's hub set-up through
Popkin.

- `frontend/proxy.conf.json` forwards `/api` only. The hub is designed at `/hubs/popkin`, so the
  development server will not reach it until the proxy gains a `/hubs` entry with WebSockets on.
- ADR 0005 and `e2e/fixtures/pk-test.ts` answer `**/api/**` and fail a test on any unanswered
  `/api` request. A hub connection is a negotiate request and a WebSocket under `/hubs`, which
  that route does not match, so today it would leave the test and reach whatever is listening.
  The live-messages design plans a "behaviour test with the hub stubbed in Playwright" without
  saying how.

**Improvement.** Amend ADR 0005 before the first hub feature: the hub is stubbed for every page
with Playwright's WebSocket routing, an unstubbed hub connection fails the test as an unanswered
request does, and `e2e/fixtures/` gains one helper that speaks the hub's handshake and lets a spec
push an event by name. Update the e2e section of `AGENTS.md` to match.

## Background work: the Worker

### 10. Keep the Worker job thin and its clock injectable

**BombRMan.** The loop (`GameState.RunGameLoop`, `GameState.cs:368-412`) reads the real clock and
sleeps, so every test of round timing waits in real time: a three-second fuse and a three-second
reset delay make single tests wait fifteen seconds and more, and one needed a thirty-second
deadline to stop being flaky under load (`GameServerIntegrationTests.cs:222-241`). Where the
project could, it pulled the arithmetic out into pure functions and tested those instantly
(`BombLogic`, and randomness injected as `Func<int, int>`, `GameState.cs:80`).

**Popkin.** `WrapUpDuePopkinsJob` is designed as a `BackgroundService` on a 30-second
`PeriodicTimer` that sends `WrapUpDuePopkinsCommand`; the handler reads `now` from
`TimeProvider`. That is already the right split. The gap is the timer: a `PeriodicTimer` built
without the `TimeProvider` ticks in real time, and a test of "within one minute" (L2-044 AC1)
would have to wait for it.

**Improvement.** In the time-is-up design, build the timer from the injected `TimeProvider`, so a
test advances `FakeTimeProvider` and the job ticks at once. Keep the job to the loop alone;
everything decided goes in the handler, which the acceptance tests already reach through MediatR.

### 11. Give the Worker loop a visible heartbeat and a clean stop

**BombRMan.** Four details in the loop are worth taking:

- An exception in one tick is logged and the loop continues (`GameState.cs:389-396`). The Popkin
  design already says this.
- The loop counts its own overruns and the worst gap between ticks, and logs a warning when it
  falls behind (`GameState.cs:180-183`, `:400-403`).
- Shutdown is acknowledged: the loop sets an event when it exits, and the host waits up to five
  seconds for it and logs which happened (`GameState.cs:95-107`, `:408-411`).
- The thread is named (`BombRMan.GameLoop`).

**Popkin.** A Worker that stops ticking fails silently: Popkins stop wrapping up, and nothing
answers a request to say so. The Worker has no HTTP surface to probe.

**Improvement.** Add to the time-is-up design: the job records, each tick, when it last finished
and how late the oldest Popkin it wrapped up was (now minus `EndsAt`), as metrics
(improvement 19) and as a warning log when the lateness passes one minute. On shutdown it finishes
the batch in hand and stops; the batches of the design make that cheap.

## Testing

### 12. Add hub integration tests on `ApiFactory`

**BombRMan.** Its hub tests run the real host in memory and connect a real SignalR client through
the test server's handler, on long polling, with no port and no browser
(`GameServerIntegrationTests.cs:303-309`):

```csharp
new HubConnectionBuilder()
    .WithUrl(new Uri(factory.Server.BaseAddress, "game"), options =>
    {
        options.HttpMessageHandlerFactory = _ => factory.Server.CreateHandler();
        options.Transports = HttpTransportType.LongPolling;
    })
    .Build();
```

Several clients connect to one server in one test, which is how the ordering and mid-round-join
bugs were pinned down.

**Popkin.** `backend/tests/Popkin.Api.Tests/ApiFactory.cs` already gives the InMemory store, the
fake clock and a browser-like HTTP client. It has no hub client, and
`backend/Directory.Packages.props` has no `Microsoft.AspNetCore.SignalR.Client`.

**Improvement.** With the first hub slice, add `ApiFactory.CreateHubConnectionAsync(client)`
beside `CreateBrowserClient()`: the same pattern, carrying the session cookie and the
`Sec-Fetch-Site: same-origin` header that `SameSiteRequestMiddleware` requires for `/hubs`. This
stays inside ADR 0005 (InMemory, no real database) and makes these acceptance criteria testable at
the API, where `AGENTS.md` wants backend acceptance tests: a connection without a session is
refused (L2-050 AC4), a non-member receives nothing from a Popkin (L2-051), a direct message
reaches exactly two people.

### 13. Wait on events in tests, never on the clock

**BombRMan.** The history shows the progression: polling a queue in a loop, then
`Channel<T>` with an awaited predicate and a timeout (`75ca34c`, "Use Channel<T> instead of
polling ConcurrentQueue in SignalR tests"; helper at `GameServerIntegrationTests.cs:367-390`),
`TaskCompletionSource` created with `RunContinuationsAsynchronously`, and finally waiting on the
server's own state instead of assuming a number of sends was enough (`6d530c5`). What remains
flaky-prone is what still sleeps: `await Task.Delay(100)` at lines 98 and 323.

**Popkin.** API tests are sequential and time is `FakeTimeProvider`, so Popkin starts ahead. Hub
tests bring the first truly asynchronous assertions into the suite: an event arrives some time
after the request that caused it.

**Improvement.** Put one helper in `Popkin.Api.Tests/Support/` with the hub client: collect
events into a channel, and `await` the first that matches, with a timeout that fails with the
events actually received. Add one sentence to the Tests section of `AGENTS.md`: a backend test
never sleeps; it awaits an event or advances the clock.

### 14. Test dense rules directly, beside the acceptance tests

**BombRMan.** 37 of its tests are on `BombLogic` alone: chain reactions with cycles, simultaneous
eliminations, the power-up race. Each runs in microseconds and names one rule. Commit `0b27cfe`,
"Harden game-rules correctness with regression tests", added most of them after bugs.

**Popkin.** Acceptance tests go through the API, which is right for behaviour a person can
observe. `Popkin.Application.Tests`, `Popkin.Infrastructure.Tests` and `Popkin.Worker.Tests` are
empty, and there is no test project for `Popkin.Domain`, where `PopkinRules.cs` lives. Rules with
many cases are coming: `ThreadReadState.Advance`, unread counts, the time-left units of L2-044,
the one-call-under-way rule.

**Improvement.** Keep the acceptance test as the proof of each slice. Where a rule has a table of
cases, add a direct test of the domain type or handler in the matching test project, one case per
row, and keep the API test to one or two representative paths. This is a behaviour test of a rule,
not a test of the codebase's shape, so the ban on architecture tests does not touch it.

### 15. Decide how pure frontend logic is tested

**BombRMan.** `client-tests/` loads the real client scripts, unmodified, into a Node `vm` sandbox
and tests them with `node --test`: no browser, no bundler, no dependency
(`client-tests/load-client.js`). It covers the key bitfield and the map.

**Popkin.** `frontend/package.json` has no test script; the frontend is tested only through
Playwright against recorded answers. That suits pages. It suits less the logic the chat designs
put in the `api` library: `ThreadStore` (duplicate and echo handling, scroll anchoring),
`MessageOutbox` (ordering, pause behind a failed entry, retry), `UnreadTracker`, and the
version rules of improvement 3. Driving every branch of an outbox through a browser with stubbed
failures is slow and indirect.

**Improvement.** Decide by ADR before journey 3, since it changes ADR 0006's "only behaviour
Playwright tests run": either the `api` library's stores get unit tests with Angular's test
runner, run in CI, or the decision is recorded that Playwright alone covers them and the stub
fixtures are built to make that practical. BombRMan's own caution applies: its `client-tests` are
not run by its CI workflow, and a suite CI does not run is not a suite.

### 16. Run every check in CI that the README names

**BombRMan.** `.github/workflows/ci.yml` runs `dotnet test` and nothing else. The Node client
tests and the container build exist, are documented, and are not checked.

**Popkin.** The same gap, smaller: the README lists "End-to-end type check — `npm run typecheck`"
in `e2e/`, and `.github/workflows/ci.yml` does not run it. Playwright runs TypeScript without
type-checking it, so a type error in a page object or fixture passes CI.

**Improvement.** Add `npm run typecheck` to the `e2e` job. As a habit: when a command enters the
README's "Building and testing" table, it enters CI in the same change, or the table says who runs
it by hand (as it does for the sweeps).

## Observability

### 17. Add the request logging the rules already require

**Popkin.** `AGENTS.md` says "Keep request logging outside the exception-handling middleware so
handled response statuses are logged correctly", and the reliability design repeats it. There is
no request logging in `backend/src/Popkin.Api/Program.cs`: `UseExceptionHandler` is at line 63
and nothing logs requests before or after it. The only log statements in `backend/src` are the
development code sender and `UnexpectedExceptionHandler`.

**BombRMan.** Not a model here, only the prompt: its service defaults turn telemetry on for every
request in three lines of `Program.cs`.

**Improvement.** Add request logging above `UseExceptionHandler`, with the method, the route
template, the status and the duration, and never the body, query string, phone number or email
(L2-054). This is the rule being implemented, not new behaviour. Improvement 18 may replace the
mechanism later; the placement rule stays.

### 18. Adopt OpenTelemetry for logs, metrics and traces

**BombRMan.** `BombRMan.ServiceDefaults/Extensions.cs` is the standard Aspire service-defaults
file: OpenTelemetry logging with scopes, ASP.NET Core, HTTP-client and runtime metrics, tracing
with health checks filtered out, and an OTLP exporter that is added only when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set (lines 82-87). With no endpoint configured it exports
nothing and costs almost nothing; with one, the same binary reports to any backend.

**Popkin.** The reliability design leaves "the logging sink and retention" as `<TO SUPPLY>`.
`UnexpectedExceptionHandler` logs a reference code with each failure, which is only useful if
someone can search for it. There are no metrics and no traces, and the Worker and the API will
soon need to be read together (a wrap-up starts in one and is pushed by the other).

**Improvement.** Decide by ADR: OpenTelemetry in the API and the Worker, OTLP export switched on
by configuration alone, and where the shared set-up lives. BombRMan's separate
`ServiceDefaults` project would add a project outside Popkin's layer list; registering it from
`AddInfrastructure` keeps the layers as they are. The ADR must also state what never enters a log
or a span: contact details, codes, message text, session identifiers (L2-054). Put the reference
code of a failure on the active span, so the code a person reads out finds the trace.

### 19. Measure the promises the requirements make

**BombRMan.** The server counts what it cares about, every second: ticks, inputs processed, tick
overruns, the worst gap, queue depth, players (`GameState.cs:143-187`). It logs a warning when
any of them shows trouble. One of the counters shows the limit of doing this by hand: nothing
ever increments `_droppedInputs`, so its warning can never fire
([What not to copy](#what-not-to-copy)).

**Popkin.** The requirements contain numbers that nothing measures once the code is running:

| Requirement | Promise | Measurement that would show it |
|---|---|---|
| L2-055 AC3 | 95 % of reads within 300 ms, 99 % within 1 s | ASP.NET Core's request-duration histogram, by route |
| L2-027 AC1 | A message arrives within 1 s | Time from the commit to the hub send, per event |
| L2-044 AC1 | A Popkin wraps up within 1 minute of its end | Lateness at wrap-up (improvement 11) |
| L2-053 | Limits hold | Count of 429s by policy |
| L2-003 and the code screens | A code arrives | Count of code-send failures by channel |

**Improvement.** Use `System.Diagnostics.Metrics` instruments, exported by improvement 18, not
hand-rolled counters. The request histogram and SignalR's connection metrics come with the
framework once metrics are on. Each design that states a number adds one line naming its
instrument; the three custom ones above are a few lines of code each.

### 20. Split liveness from readiness

**BombRMan.** `/alive` passes when the process responds; `/health` passes when every registered
check does (`Extensions.cs:109-126`). The split is right. Its flaw is that both are mapped in
Development only, so the container, which runs as Production, has no probe at all.

**Popkin.** `GET /api/health` returns a constant
(`backend/src/Popkin.Api/Controllers/HealthController.cs`). The reliability design uses it for
one job: the browser's `Connectivity` probes it to tell "offline" from "the API cannot be
reached". For that job a constant is correct. For a deployment it is not enough: an API whose
database is unreachable reports healthy and receives traffic.

**Improvement.** Keep `/api/health` exactly as it is, as liveness and as the browser's probe. Add
a readiness check that includes the database, for the platform to call. L2-050 AC1 lists the
endpoints served without a session and names "health" once, so the requirement needs a small
edit to cover the second endpoint, and the check must answer with a status and nothing else.

## Delivery and local development

### 21. Build a container image and write the deployment document

**BombRMan.** A multi-stage `Dockerfile` (SDK image to build, ASP.NET runtime image to run), the
non-root `app` user, an explicit port, and `DEPLOYMENT.md` with build, run, a manual smoke test,
configuration notes and a "Known gaps" section that says plainly there is no TLS termination and
no orchestration.

**Popkin.** No Dockerfile, no deployment document. The README has two sentences: the `popkin`
tool migrates, and "a deployed API also needs `Auth:CodeHashKey` … and `Invites:BaseUrl`".
`App:Origin`, which `SameSiteRequestMiddleware` reads, is not mentioned, and neither are the
Worker or how the Angular app is served.

**Improvement.** An ADR for the shape (which processes, who serves the built frontend, one
instance per improvement 8), then:

- Images for the API and the Worker, built the BombRMan way, with the SDK version taken from
  `backend/global.json`.
- `popkin migrate` as its own release step. Popkin's rule that the API never migrates on startup
  fits this well.
- `docs/deployment.md` with every setting a deployed system needs and what happens without it,
  the proxy requirements (TLS, WebSockets, forwarded headers: improvement 22), the health
  endpoints, and a smoke test.
- A CI job that builds the images on every pull request. See the BombRMan image in
  [What not to copy](#what-not-to-copy) for why.

### 22. Trust the proxy's forwarded headers

**BombRMan.** `DEPLOYMENT.md` says to "put the container behind a reverse proxy or load balancer
that terminates TLS". For BombRMan that sentence is the whole of it, because nothing in it reads
the client's address or scheme.

**Popkin.** Two things in Popkin do, and nothing configures forwarded headers (there is no
`UseForwardedHeaders` in `backend/src`):

- `RateLimitPolicyNames.cs` partitions the code limit by `Connection.RemoteIpAddress`. Behind a
  proxy that is the proxy's address for every request, so **all people share one allowance of 10
  codes per 10 minutes** (L2-053 AC1), and the eleventh person to sign up is refused.
- `UseHttpsRedirection` and `UseHsts` (`Program.cs:57-61`) see every request as HTTP when TLS
  ends at the proxy, which can produce a redirect loop.

The session cookie is not affected: `SessionCookie.cs` sets `CookieSecurePolicy.Always`.

**Improvement.** Add forwarded-header handling as the first middleware, trusting only the
configured proxy, and record it in the abuse-limits and security designs. Cover it with an API
test: two requests with different forwarded addresses fall into different rate-limit partitions.
This is the highest-value item for a first deployment, because the failure appears only in
production.

### 23. Start everything with one command

**BombRMan.** `BombRMan.AppHost/AppHost.cs` is six lines. `dotnet run` on it starts the server
and the Aspire dashboard, with logs, traces, metrics and health for each resource. `.vscode/`
holds launch and task files, so F5 works.

**Popkin.** The quick start takes two terminals (`pwsh eng/Start-E2eApi.ps1`, then
`npm start --prefix frontend`). The Worker will be a third once it hosts the wrap-up job, and
without it a Popkin with an end date never wraps up on a developer's machine.

**Improvement.** When the Worker gets its first job, add an AppHost that starts the API, the
Worker and the Angular development server, by ADR, since it adds projects to the backend layout
in `AGENTS.md`. It pays for itself together with improvement 18: the dashboard is then where a
developer watches one wrap-up cross from the Worker to the hub. Until then, the two-terminal
start is adequate and an AppHost would be ceremony.

### 24. Take the SignalR client from npm, pinned to the server

**BombRMan.** The JavaScript client is fetched by `libman.json` at version 6.0.4 and the output
is committed: 251 files under `wwwroot/js/@microsoft/signalr/`, including source, four module
formats and source maps, against a .NET 10 server.

**Popkin.** The live-messages design leaves "the SignalR client package version" as
`<TO SUPPLY>`.

**Improvement.** Supply it: `@microsoft/signalr` from npm in `frontend/package.json`, on the
release line of the server's ASP.NET Core, updated with it. Nothing is vendored.

### 25. Keep backend test results from CI

**BombRMan.** `dotnet test` writes a `.trx` file and the workflow uploads it whether the run
passed or failed (`ci.yml:29-36`).

**Popkin.** The `e2e` job uploads the Playwright report on failure. The backend job uploads
nothing, so a failure that happens only on the runner leaves just the console text. That matters
more once hub tests exist (improvement 12), since those are the tests most likely to fail one
time in fifty.

**Improvement.** Have `eng/Test-Backend.ps1` write a results file and the backend job upload it
on failure. Also add `"allowPrerelease": false` to `backend/global.json`, as BombRMan's has, so
a preview SDK on a developer's machine is never picked up.

## Documentation

### 26. Bring `AGENTS.md` back in line with the repository

**BombRMan.** `ARCHITECTURE.md` opens with "This document describes what exists in the repository
today" and holds to it; when a gap closed, the line was struck through with what resolved it.
Even so it drifted where nobody looked: `CONTRIBUTING.md` says nullable reference types are
enabled, and neither project file enables them.

**Popkin.** `AGENTS.md` is the single source of guidance and its overview describes an earlier
repository:

- "The repository is a scaffold. It holds … a backend that answers `GET /api/health`, an app with
  one placeholder screen and one behaviour spec." The backend has authentication, sessions,
  Popkin creation and three migrations; the components library has 96 files; the estimates put
  the whole at 15 %.
- "There are no requirements, mocks or design system yet: the folders under `docs/` are empty."
  `docs/specs/L1.md` and `L2.md`, 52 detailed designs, the mocks and the design system exist.
- It names `docs/journey.md` twice; the file is `docs/journeys.md`.
- The test-project notes say "empty until its first test" for `Popkin.Cli.Tests`, which has
  `CliTests.cs`.

**Improvement.** Rewrite the "Project overview" paragraphs to say what exists, and correct the
path. An agent that reads "the folders under `docs/` are empty" is being told not to look for the
design it is required to follow.

### 27. Keep one register of known gaps

**BombRMan.** One numbered "Known gaps" list in `ARCHITECTURE.md`, each gap closed in place with
a pointer to what closed it. A reader learns in one screen what the project cannot do yet.

**Popkin.** The honest equivalent is the `<TO SUPPLY>` marker, and there are 253 of them across
the detailed designs (chat 45, experiences 35, photos 34, accounts 33, wrap-up 20, invitations
17, security 17, calls 14, popkins 14, reliability 14, accessibility 6, landing 2). Some are copy.
Some decide the architecture: mesh or SFU for calls, the media-relay provider, the photo store,
the SMS and email providers, the backplane, the logging sink. They are findable only by search,
and nothing says which of them block which journey.

**Improvement.** Add a "Known gaps" section to `docs/detailed-designs/README.md` (or a page
beside it) that lists the open questions that are decisions, not copy, each with the journey it
blocks and, when settled, the ADR or design that settled it. The estimates then have something to
point at when a subsystem cannot start.

## What not to copy

BombRMan's weaknesses are as instructive as its strengths. Popkin should recognise each and
avoid it.

| In BombRMan | Why not | Popkin's position |
|---|---|---|
| `GET /diagnostics` is anonymous and mapped in every environment (`Program.cs:29`) | It publishes the full server state to anyone | Authentication by default; any diagnostic surface is a designed, authorised endpoint |
| The diagnostics snapshot copies `List<T>` fields that the game thread is mutating, by design (`GameState.cs:207-213`, `:250-252`) | `ToArray()` during a concurrent `Add` can throw or return torn data; "acceptable for diagnostics" until it is the thing that crashes | `PresenceTracker` will be read and written from many connections: give it one lock or a concurrent collection from the start |
| High-frequency sends are fire-and-forget (`_ = …SendAsync`), with no observation of failure | A failed send is invisible | Popkin's sends are awaited in the request; keep it so, and count failures (improvement 19) |
| `Clients.All` for everything | Fine with one room; a privacy breach with many | Every Popkin send names a group or users (L2-051). A hub test should prove a non-member receives nothing (improvement 12) |
| Domain objects serialised straight to clients (`Player` is sent as is) | The wire format changes whenever the model does | DTOs in `Popkin.Application`; keep it so on the hub (improvement 7) |
| Everything in one `Hubs/` folder and namespace: hub, loop, rules, model, wire types | No dependency direction to protect the rules | Popkin's layers; improvement 1 keeps the hub from eroding them |
| Tests kept alive for code the product no longer calls: `TrimQueue` and `ComputeFrameAdvance` are referenced only by tests (commit `d0e301f`, "Restore diagnostics queue helper compatibility") | They report coverage of behaviour that does not exist | Delete a test with the behaviour it proved |
| A counter that is never incremented (`_droppedInputs`), so its warning cannot fire; an unused limit (`MAX_QUEUED_INPUTS_PER_PLAYER`) | Dead diagnostics give false comfort | Use framework instruments (improvement 19) |
| Health endpoints in Development only | The deployed container has no probe | Improvement 20 |
| The `Dockerfile` copies `BombRMan.Core.Tests.csproj` for the restore but not `BombRMan.ServiceDefaults.csproj` (lines 8-10), which `BombRMan.Core.csproj` has referenced since #27, and then publishes with `--no-restore` | The image was written in #24 and the reference added in #27; the build very probably fails now. **Not verified: the image was not built for this document.** CI never builds it, so nothing would have said | Build the image in CI (improvement 21) |
| No client reconnect; a slot is freed at the first drop | Improvement 6 | Designed; the values are missing |
| Real-time tests that wait on the real clock | Improvements 10 and 13 | `FakeTimeProvider` everywhere |
| Sync-over-async on the game thread (`GameState.cs:647-656`) | Sound there, on a dedicated thread, and well explained in its comment; never sound on a request or hub thread | No Popkin code should block on a task |
| Documentation that outlives the code (`CONTRIBUTING.md` on nullable; the README's "rest of the active roadmap (CI, Docker…)" after both shipped) | Improvement 26 | The same drift has begun in `AGENTS.md` |

One thing BombRMan does that looks like a weakness and is not: the comment on `ResetRound`
explains at length why it blocks, what that risks and how the risk is surfaced. Popkin's code
does the same in fewer words (`Program.cs` cites the acceptance criterion beside each unusual
line). Keep doing that; it is the cheapest documentation either project has.

## What Popkin already does better

So that nothing above is read as a suggestion to move toward BombRMan's structure:

- **Layers with one direction**, against one project and one namespace.
- **Requirements, designs and mocks before code**, with acceptance tests written first. BombRMan's
  tests arrived after its bugs.
- **Authentication by default** with a fallback policy; BombRMan has no authentication.
- **Errors as ProblemDetails with a `code`**, and no internal detail in any response.
- **Time and randomness injected** (`TimeProvider`, `ICodeGenerator`, `IInviteCodeGenerator`), so
  tests control them. BombRMan injects randomness only.
- **One InMemory store per fixture and sequential API tests**; BombRMan shares one game state
  across a test class unless a test remembers to ask for a fresh host.
- **Central package versions, nullable on, warnings as errors.** BombRMan has none of the three.
- **A browser-level suite with a page object model.** BombRMan's `CONTRIBUTING.md` asks
  contributors to check client changes by hand in two tabs.
- **Decisions recorded as ADRs.**

## Suggested order

1. **Now, independent of any feature**: 26 (correct `AGENTS.md`), 16 (type-check the e2e suite in
   CI), 17 (request logging), 25 (backend test results), 27 (the known-gaps register).
2. **Before the first hub slice (journey 3)**: 8 and 9 (the single-instance ADR, the proxy and
   the ADR 0005 amendment), 15 (how frontend logic is tested), then 1, 2, 3, 7 and 24 as edits to
   the live-messages design, and 12 and 13 with the first hub test.
3. **With calls (journey 7)**: 4, 5 and 6 in the calls designs.
4. **With wrap-up (journey 9)**: 10 and 11 in the time-is-up design; 23 when the Worker has its
   job.
5. **Before anything is deployed**: 22 first, then 18, 19, 20 and 21.
6. **Continuously**: 14.

Each item that changes production behaviour goes through the `implementing-incrementally` skill
with its acceptance test first, as `AGENTS.md` requires. The items marked "design" are edits to
documents that already exist and can be made at any time before their journey starts.

## What has been applied

13 November 2026. The documents were changed; **no code was changed**, at the repository owner's
direction. "Document" below means the decision or design is written and the code waits for it.

| # | Applied as | Code still to change |
|---|---|---|
| 1 | `AGENTS.md`; shared real-time rules in the [designs' README](../detailed-designs/README.md); group-call design | With the hub |
| 2, 3 | Live-messages design (events, kinds, recovery reads), group-call, call-controls, time-is-up | With the hub |
| 4, 5, 6 | Group-call, call-controls and abuse-limits designs; grace 20 s, reconnect 0, 2, 10, 30 s | Journey 7 |
| 7 | Shared rules; live-messages; wrap-up events renamed to PascalCase | With the hub |
| 8 | [ADR 0009](../adr/0009-one-api-instance.md) | None |
| 9 | [ADR 0010](../adr/0010-the-hub-in-tests.md); `AGENTS.md` | `frontend/proxy.conf.json` needs a `/hubs` entry with WebSockets |
| 10, 11 | Time-is-up design | Journey 9 |
| 12, 13 | ADR 0010; live-messages design; `AGENTS.md` | With the hub |
| 14 | `AGENTS.md` | As rules arrive |
| 15 | [ADR 0011](../adr/0011-unit-tests-for-frontend-logic.md) | The test target, with the first store |
| 16 | Not applied | Add `npm run typecheck` to the `e2e` job of `ci.yml` |
| 17 | Designs name `RequestLoggingMiddleware` | Not built |
| 18 | [ADR 0012](../adr/0012-opentelemetry.md) | Not built |
| 19 | Measurements table in the designs' README; one line in each design | With each feature |
| 20 | L2-050 AC1 and AC5; loading-failure-offline and sessions designs | `GET /api/health/ready` not built |
| 21 | [ADR 0013](../adr/0013-deployment-shape.md); [`docs/deployment.md`](../deployment.md) | Dockerfiles and the CI image job not built |
| 22 | Abuse-limits and personal-data designs; `AGENTS.md` | `UseForwardedHeaders` not built |
| 23 | Known gaps, row 16 | When the Worker has a job |
| 24 | Shared rules; live-messages design | With the hub |
| 25 | Not applied | Results file in `eng/Test-Backend.ps1`, upload in `ci.yml`, `allowPrerelease` in `global.json` |
| 26 | `AGENTS.md`, `README.md`, `CONTRIBUTING.md` | None |
| 27 | Known gaps in the designs' README | None |
