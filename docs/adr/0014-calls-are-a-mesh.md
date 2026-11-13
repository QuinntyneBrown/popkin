# 0014. Calls: a mesh of peer connections, signalled through the hub

## Status

Accepted, 13 November 2026.

## Context

[Group call](../detailed-designs/calls/group-call/README.md) left the media topology open: a
mesh, where every browser on a call holds one WebRTC connection to each other browser, or a
selective forwarding unit (SFU), a media server every browser sends to once. It also left open
the media relay and how its credentials are issued. L2-029 asks for a call the whole Popkin can
join with one tap and shows at most 12 people at once; nothing in the requirements names a call
size. Popkin runs as one API instance with no other server of its own (ADR 0009, ADR 0013).

## Decision

- **A call is a mesh.** Each browser sends its microphone and camera straight to each other
  browser on the call. Popkin's API never carries media; it records who is on the call and
  relays the signals that set the connections up, through `PopkinHub`.
- **The one who arrives offers.** A person who joins offers a connection to everyone already on
  the call, who answer. When both sides offer at once (after a reconnect), the side whose
  membership id sorts first gives way and answers instead.
- **The frontend hides the topology behind `PeerLinks`** (`api` library). `CallSession` knows who
  is on the call and carries signals; `WebRtcPeerLinks` alone touches `RTCPeerConnection`. An SFU
  later replaces that one class and the relay settings, not the pages, the session or the hub's
  contract.
- **The media relay is any TURN server that takes the shared-secret (REST) credentials**, such as
  coturn with `use-auth-secret`. `TurnCredentialIssuer` signs a short-lived user name per
  participant with `MediaRelay:Secret`; the settings are in `docs/deployment.md`. With no relay
  configured the API answers no ICE servers and browsers connect directly, which is enough on
  one network and for local development. Which hosted relay a deployment uses stays its own
  choice and needs no code.
- **No test reaches a relay or a second machine.** Backend tests prove the call's records and the
  relaying of signals; the frontend's unit tests prove `CallSession` against a stand-in for
  `PeerLinks`; the Playwright suite stubs the microphone and camera in the page and answers the
  hub (ADR 0010).

## Consequences

- No media server to run, pay for or secure, and nothing of a call's sound or picture ever
  reaches Popkin's servers.
- Every person on a call sends their picture once per other person. A phone manages a handful;
  a call of twelve asks each browser for eleven uploads and is beyond most phones and home
  connections. The limit of twelve tiles (L2-029 AC7) is a limit of what is shown, not of who may
  join, so a large Popkin can start a call that works badly. A cap on who may join, or an SFU, is
  the correction; either needs its own record, and a cap needs a requirement first.
- Without a relay two people behind strict networks cannot reach each other. A deployment that
  is meant for the public internet configures one.
- Signals are relayed to one connection of one person and never stored or read. The hub limits
  how many a connection may send ([Abuse limits](../detailed-designs/security/abuse-limits/README.md)).
