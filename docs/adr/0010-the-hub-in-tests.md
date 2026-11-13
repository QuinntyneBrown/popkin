# 0010. The hub in tests: stubbed in Playwright, in memory in the backend

## Status

Accepted, 13 November 2026. Amends ADR 0005: its rules for `/api/**` now cover the SignalR hub at
`/hubs/**` as well.

## Context

ADR 0005 answers every `/api/**` request of the e2e suite from a recording and fails a test on a
request without an answer. The first real-time feature adds `PopkinHub` at `/hubs/popkin`. A hub
connection is a negotiate request and a WebSocket under `/hubs`, which the `**/api/**` route does
not match: unhandled, it would leave the test and reach whatever is listening on the development
server's proxy target.

On the backend, hub behaviour (who may connect, who receives an event) has acceptance criteria
(L2-050 AC4, L2-051) that belong in API tests, and events arrive some time after the request that
caused them. A test that sleeps to wait for one is slow when it passes and flaky when the machine
is busy.

## Decision

- **E2E: the hub is stubbed for every page.** The `page` fixture of `e2e/fixtures/pk-test.ts`
  answers the negotiate request under `/hubs/**` and routes the hub's WebSocket with Playwright's
  WebSocket routing (`page.routeWebSocket`). No test opens a connection to a real hub.
- **One helper speaks the protocol.** `e2e/fixtures/hub.ts` completes the SignalR JSON handshake,
  answers pings, records what the app invokes, and lets a spec push an event by name with its
  payload. Specs and page objects never write protocol frames themselves.
- **An unstubbed hub request fails the test**, as an unanswered `/api` request does: any request
  or WebSocket under `/hubs/**` that the helper does not handle is recorded in `unanswered`.
- **Backend: hub tests run on `ApiFactory`.** A real SignalR client connects through the test
  server's handler (`ApiFactory.CreateHubConnectionAsync`), on the EF Core InMemory provider, with
  no port and no browser. Several clients may connect in one test.
- **A backend test never sleeps.** It awaits an event, with a timeout that fails naming the
  events that did arrive, or it advances `FakeTimeProvider`. `Task.Delay` and `Thread.Sleep` have
  no place in a test.
- The helper, the fixture route and `CreateHubConnectionAsync` are added by the first change that
  adds the hub; until then the development proxy alone knows `/hubs`
  (`frontend/proxy.conf.json`).

## Consequences

- The e2e suite still needs only the Angular development server.
- The e2e suite proves the app against the hub's contract as the helper speaks it. A change to an
  event's name or payload changes the helper's callers in the same change; the typed event map of
  the `api` library keeps the names in one place.
- The stub does not prove delivery time, ordering under load or reconnection against a real
  server. Ordering and recovery rules are proved in the backend hub tests and, for the web app's
  stores, as ADR 0011 decides.
- Backend hub tests use the long-polling transport, because the test server has no WebSocket
  listener; the WebSocket transport itself is not exercised by any automated test.
