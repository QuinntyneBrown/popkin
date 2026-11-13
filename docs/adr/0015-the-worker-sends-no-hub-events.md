# 0015. The Worker sends no hub events

## Status

Accepted, 13 November 2026.

## Context

The Popkin Worker hosts its first jobs with journey 9: it wraps up a Popkin whose time is up,
removes the photos of an album that was not kept, and prepares the zip of an album
([Time is up](../detailed-designs/wrap-up/time-is-up/README.md)). L2-044 AC4 asks that a member
who has a Popkin open when it wraps up moves to the recap without a reload.

When the Host wraps a Popkin up, the Popkin API does it and tells its hub, `PopkinHub`, which
holds every member's connection. The Worker is another process. It holds no connection, and the
API keeps its hub groups in its own memory ([ADR 0009](0009-one-api-instance.md)). For the Worker
to send a hub event, both processes would need a SignalR backplane (Redis or a hosted SignalR
service): one more thing to run, to secure and to pay for, for one event that is due at a time
every client already knows.

## Decision

- **The Worker sends no hub events.** Its `IPopkinNotifier` does nothing.
- **The web app carries a timed wrap-up to open screens by the clock.** Every screen inside a
  Popkin knows when it ends. Once that time has passed, the app reads the Popkin every
  30 seconds until it reads as wrapped up, then opens the recap (`WrapUpWatch` in the `api`
  library). The Worker wraps a due Popkin up within a minute, so the member moves within about
  a minute and a half of the end, with no reload.
- **A wrap-up by the Host is still sent over the hub** (`PopkinWrappedUp`), by the API, and
  moves every open screen at once.
- **A member who acts in the gap** is refused with `409 popkin_wrapped_up`, and the screen they
  are on says so as it did before; the watch moves them at its next reading.
- The album's zip is followed by asking for its progress each second, not by an event.

## Consequences

- No backplane, and the API stays the only process with connections. This settles row 13 of the
  register of known gaps.
- The move to the recap after a timed wrap-up is late by up to the Worker's tick and the app's:
  about a minute and a half, where the hub would take a second.
- A device whose clock is behind reads late by as much; one that is ahead asks early and keeps
  asking each 30 seconds until the Popkin has wrapped up.
- A job that must tell members something no client can know by the clock (a reminder, for
  example) cannot be built this way. It needs a record that supersedes this one, with the
  backplane or a call from the Worker to the API.
- The number of Worker instances does not matter to the hub. It is one, as the deployment
  document says; the concurrency token on a Popkin keeps a second from wrapping it up twice.
