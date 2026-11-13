# 0009. Popkin runs one API instance

## Status

Accepted, 13 November 2026.

## Context

Several parts of Popkin keep state in the memory of the API process, and none of them says so for
the system as a whole:

- SignalR groups (`popkin:{popkinId}`, `call:{callId}`) and the connections in them.
- `PresenceTracker`, the map behind "here now"
  ([Live messages](../detailed-designs/chat/live-messages/README.md)).
- The rate limiters of `Popkin.Api/RateLimiting`, which count in process memory
  ([Abuse limits](../detailed-designs/security/abuse-limits/README.md)). Two instances allow
  twice the codes of L2-053 AC1.
- `CallParticipant.ConnectionId`, the hub connection a call signal is relayed to
  ([Group call](../detailed-designs/calls/group-call/README.md)).
- The Data Protection key ring that encrypts the session cookie
  ([Sessions](../detailed-designs/accounts/sessions/README.md)).

Each is correct with one instance and wrong with two. A second instance started by a platform's
autoscaler would break privacy limits and real-time delivery without any error.

## Decision

- Popkin runs **one instance of the Popkin API**. The deployment document says so and gives this
  record as the reason.
- Anything that keeps state in the API's memory is written for one instance and is listed in the
  Context above. A design that adds such state adds it to the list in a new record or in the
  record that ends this one.
- Running more than one API instance is a decision of its own, made by a record that supersedes
  this one. It needs, at least: a SignalR backplane, a shared presence store, a distributed
  rate-limit counter, a shared Data Protection key ring, and a way to reach a call participant's
  connection from any instance.
- The Worker is a separate process and is not an API instance. It holds no hub connections.

## Consequences

- The API is restarted to deploy; open hub connections drop and reconnect. Every hub event
  therefore has a recovery read (the shared real-time rules in
  [the designs' README](../detailed-designs/README.md)).
- One instance bounds the load Popkin serves. The load target is `<TO SUPPLY>`; when it exceeds
  one instance, this record is superseded, not worked around.
- The [Time is up](../detailed-designs/wrap-up/time-is-up/README.md) design sends `PopkinWrappedUp`
  from the Worker through a backplane that is not chosen. Until it is, a Popkin that the Worker
  wraps up reaches open screens through the web app's clock check, not through the hub. This gap
  is in the [known gaps](../detailed-designs/README.md#known-gaps).
