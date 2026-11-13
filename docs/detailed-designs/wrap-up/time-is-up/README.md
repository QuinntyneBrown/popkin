# Time is up

## Overview

A Popkin is a private space for one group. When the Host starts it, the Host chooses how long it
lasts (L2-009). A Popkin with an end date ends by itself when that date arrives. A Popkin with no
end date, called ongoing, lasts until its Host wraps it up (see
[The Host wraps up](../host-wraps-up/README.md)).

**end date** — instant, stored as `PopkinSpace.EndsAt`, at which a Popkin wraps up by itself

**ongoing Popkin** — Popkin whose `EndsAt` is empty and which never wraps up by itself

**time left** — interval from now to the end date, shown in its largest two units ("1 day 6 hrs
left", "42 min left")

**wrap-up warning** — banner shown inside a Popkin when one hour or less is left

This feature covers four things. A background job in the Popkin Worker wraps up every Popkin
whose end date has passed, within one minute, with its photo album kept. Every member sees the
time left on the Popkin home, updated at least once a minute. When one hour is left, every member
sees a warning banner; the Host's banner offers to change the length. A member who has the Popkin
open when it wraps up moves to the recap without reloading.

## Description

The slice spans the Popkin Worker, the Popkin API's real-time hub and the Popkin web app. It adds
no endpoint: the web app reads `endsAt` and `status` from the Popkin home's existing
`GET /api/popkins/{popkinId}` (see [Popkin home](../../popkins/popkin-home/README.md)).

### Screens and states

- `docs/mocks/pages/popkin-home/default.html` — header time-left pill "1 day 6 hrs left · Wraps
  up Sun, 6 pm" (L2-044 AC5, L2-019 AC1).
- `docs/mocks/pages/popkin-home/ongoing.html` — the same home with no time-left pill, for a
  Popkin with no end date (L2-044 AC3).
- `docs/mocks/notifications/banner/warning.html` — warning banner "1 hour left. Lakeside Weekend
  wraps up at 6 pm." with the Host's "Change" action and a Dismiss button (L2-044 AC2).
- `docs/mocks/dialogs/change-length/default.html` — the dialog the Host's banner action opens
  (owned by [Popkin settings](../../popkins/popkin-settings/README.md)).
- `docs/mocks/pages/wrapped-up/default.html` — the recap a member lands on when the Popkin wraps
  up while open (L2-044 AC4).

The mock's banner action reads "Change"; L2-044 AC2 names it "Change how long it lasts". The
action keeps the visible label "Change" and carries the accessible name "Change how long it
lasts", which contains the visible label (WCAG 2.5.3). The banner copy when less than one hour is
left (for example "42 min left.") is `<TO SUPPLY>`; the mocks draw only "1 hour left."

### API and real-time

- `GET /api/popkins/{popkinId}` — existing in [Popkin home](../../popkins/popkin-home/README.md);
  this slice relies on its `endsAt` (nullable), `status` and `isHost` fields.
- Hub event `PopkinWrappedUp { popkinId }` on group `popkin:{popkinId}` of `PopkinHub` — sent
  after a Popkin wraps up, by either path.
- Hub event `PopkinLengthChanged { popkinId, version, endsAt }` — sent by
  [Popkin settings](../../popkins/popkin-settings/README.md); the clock here re-reads `endsAt`
  from it (L2-020 AC4). It is a state event: `version` is the Popkin's concurrency counter, and
  the store drops an event whose version is not above the one it holds.
- On `reconnected$`, `CurrentPopkinStore` reloads the Popkin, which recovers both events.

### Backend — Popkin Worker

- **`WrapUpDuePopkinsJob`** (`backend/src/Popkin.Worker/Jobs/WrapUpDuePopkinsJob.cs`) —
  introduced; the first job the Worker hosts. A `BackgroundService` that runs a `PeriodicTimer`
  every 30 seconds. The timer is built from the injected `TimeProvider`
  (`new PeriodicTimer(period, timeProvider)`), so a test advances `FakeTimeProvider` and the job
  ticks at once; a timer built without it ticks in real time, and a test of "within one minute"
  would have to wait for it. Each tick opens a DI scope and sends `WrapUpDuePopkinsCommand`
  through MediatR. A 30-second period keeps the delay between an end date and its wrap-up under
  one minute (L2-044 AC1), with one tick of slack for a slow run. An exception in one tick is
  logged and the next tick runs.
- **The job is the loop alone.** It decides nothing: what is due, what happens to it and who is
  told all belong to the handler, which the acceptance tests reach through MediatR without a
  timer.
- **Heartbeat** — a Worker that stops ticking fails silently: Popkins stop wrapping up and the
  Worker has no HTTP surface to probe. After each tick the job records the time it finished in
  the gauge `popkin.wrap_up.last_tick` (seconds since the Unix epoch), and for each Popkin
  wrapped up it records the lateness, now minus `EndsAt`, in the histogram
  `popkin.wrap_up.lateness` ([ADR 0012](../../../adr/0012-opentelemetry.md)). A lateness over
  one minute is also logged as a warning with the Popkin's id, because it breaks L2-044 AC1.
- **Clean stop** — on shutdown the job finishes the batch in hand, then stops, and logs that it
  stopped; it starts no new batch once stopping is asked. Popkins are saved one at a time, so
  finishing a batch is short.
- **`Program.cs`** (Worker) — registers the job with `AddHostedService<WrapUpDuePopkinsJob>()`
  next to the existing `AddApplication()` and `AddInfrastructure(...)`.

### Backend — Popkin Application and Domain

- **`WrapUpDuePopkinsCommand`** — no fields; returns the number of Popkins wrapped up.
- **`WrapUpDuePopkinsCommandHandler`** — reads `now` from `TimeProvider`, selects every
  `PopkinSpace` with `Status == Active`, `EndsAt != null` and `EndsAt <= now`, in batches of
  `<TO SUPPLY>`. For each, it calls `PopkinWrapUpService.WrapUpAsync(popkin, keepPhotos: true)`
  (L2-044 AC1) and saves that Popkin on its own, so one failure does not hold back the others. A
  concurrency conflict means the Host wrapped the Popkin up in the same moment; the handler skips
  it. After each commit it calls `IPopkinNotifier.PopkinWrappedUpAsync(popkinId)`. An ongoing
  Popkin never matches the filter, so it stays active (L2-044 AC3).
- **`PopkinWrapUpService`** and **`PopkinSpace.WrapUp`** — shared with
  [The Host wraps up](../host-wraps-up/README.md).

### Backend — Popkin Infrastructure

- **`PopkinSpaceConfiguration`** — index on `(Status, EndsAt)`, so the due query reads only
  active Popkins with an end date.
- **`IPopkinNotifier`** in the Worker — the Worker runs in its own process and holds no SignalR
  connections. It sends hub events through the same `IHubContext<PopkinHub>` as the API, over a
  SignalR scale-out backplane shared by both processes. The backplane (Redis or a hosted SignalR
  service) is `<TO SUPPLY>`, and so is whether a backplane is the path at all: the API is one
  instance ([ADR 0009](../../../adr/0009-one-api-instance.md)) and needs none for itself. Until
  this is settled the Worker's `IPopkinNotifier` does nothing, and the web app's clock check
  below carries the wrap-up to open screens
  ([known gaps](../../README.md#known-gaps), row 13).

### Frontend — Popkin web app

- **`formatTimeLeft(endsAt: Date, now: Date): string`**
  (`frontend/projects/api/src/lib/api/time-left.ts`) — introduced pure helper. It returns the
  largest two non-zero units: days and hours ("1 day 6 hrs left"), hours and minutes ("1 hr 5 min
  left") or minutes ("42 min left") (L2-044 AC5). Under one minute the copy is `<TO SUPPLY>`.
- **`TimeLeftClock`** (`frontend/projects/api/src/lib/api/time-left-clock.ts`) — introduced
  injectable that exposes a `now` signal updated every 30 seconds, so every time left is redrawn
  at least once a minute (L2-044 AC5). It corrects for a wrong device clock with the offset
  between the device time and the `Date` header of the last API response. Tests replace it
  through its injection token `TIME_LEFT_CLOCK`.
- **`PopkinHomePage`** (`pages/popkin-home/popkin-home.page.ts`) — existing in
  [Popkin home](../../popkins/popkin-home/README.md); this slice adds a computed time-left label
  bound to `pk-time-left`, hidden when `endsAt` is null (L2-044 AC3).
- **Wrap-up warning** — each Popkin page that shows the Popkin tabs reads a computed signal
  `wrapUpWarning` from `CurrentPopkinStore`: true when `0 < endsAt - now <= 60 min`. When true,
  the page renders `pk-banner` (warning) with the lead "1 hour left." and the line "{name} wraps
  up at {time}." For the Host, the banner carries the action "Change", which opens
  `ChangeLengthDialog` with CDK `Dialog` (L2-044 AC2). Dismiss hides the banner for that Popkin
  until the app is reloaded.
- **Wrap-up redirect** — `CurrentPopkinStore` subscribes to `PopkinWrappedUp` through
  `POPKIN_REALTIME`. On the event, and also when `TimeLeftClock.now` passes `endsAt`, it reloads
  the Popkin; when `status` reads `wrappedUp` it navigates to `/p/:popkinId/recap` with
  `replaceUrl` (L2-044 AC4). The clock check covers a hub event lost while the connection was
  down.

### Tests

- API-level acceptance tests send `WrapUpDuePopkinsCommand` through MediatR with
  `FakeTimeProvider` set before and after an end date (L2-044 AC1, AC3).
- `Popkin.Worker.Tests` hosts the job with `FakeTimeProvider`: advancing 30 seconds sends one
  command; a tick that throws is followed by the next; stopping the host ends the loop. No test
  sleeps ([ADR 0010](../../../adr/0010-the-hub-in-tests.md)).

### Open points

- Batch size for the due query: `<TO SUPPLY>`.
- Number of Worker instances in production: `<TO SUPPLY>`. The concurrency token on
  `PopkinSpace` keeps a Popkin from being wrapped up twice when more than one instance runs.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-044` | `L1-011` | A Popkin wraps up when its time is up: A Popkin with an end date ends by itself. |

## Diagrams

### System context

Members see the time left and the warning; Popkin ends the Popkin by itself when its end date
arrives. No external system takes part.

![C4 system context for a Popkin wrapping up when its time is up](diagrams/c4-context.png)

### Containers

The Popkin Worker finds due Popkins in the Popkin database and wraps them up; the event reaches
members' web apps through the Popkin API's hub over a shared backplane.

![C4 container view for a Popkin wrapping up when its time is up](diagrams/c4-container.png)

### Components

Inside the Popkin Worker, `WrapUpDuePopkinsJob` sends `WrapUpDuePopkinsCommand` every 30 seconds;
the handler wraps up each due Popkin through `PopkinWrapUpService` and notifies members.

![C4 component view for a Popkin wrapping up when its time is up](diagrams/c4-component.png)

### Class structure

The job depends on MediatR only; the handler depends on the database context, the time
provider, the shared wrap-up service and the notifier. On the web app side, `TimeLeftClock` and
`formatTimeLeft` feed `CurrentPopkinStore`.

![Class diagram for a Popkin wrapping up when its time is up](diagrams/class-structure.png)

### Behaviour — the end date arrives

A tick finds the due Popkin, wraps it up with the album kept (L2-044 AC1) and sends
`PopkinWrappedUp`, a fact event whose recovery read is `GET /api/popkins/{popkinId}`
([Live messages](../../chat/live-messages/README.md#events-and-their-recovery-reads)); a member with the Popkin open moves to the recap without a reload (L2-044 AC4).

![Sequence diagram for the Worker wrapping up a due Popkin](diagrams/sequence-time-is-up.png)

### Behaviour — one hour left

The web app's clock redraws the time left at least once a minute (L2-044 AC5) and shows the
warning banner when one hour is left; only the Host's banner offers "Change" (L2-044 AC2).

![Sequence diagram for the one-hour warning banner](diagrams/sequence-one-hour-left.png)
