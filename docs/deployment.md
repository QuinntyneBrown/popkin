# Deployment

How Popkin is deployed, by [ADR 0013](adr/0013-deployment-shape.md). **Nothing here is built
yet**: the images, the forwarded-header handling, the readiness endpoint and the telemetry set-up
are decided and designed, not coded. Each section says what it waits for. Keep this document
true: a setting added to the code is added here in the same change.

## Shape

- One reverse proxy on one origin. It ends TLS, serves the built web app
  (`frontend/dist/popkin/browser`, with `index.html` as the fallback for app routes) and forwards
  `/api` and `/hubs` to the API, with WebSockets allowed on `/hubs`. Product: `<TO SUPPLY>`.
- **One** instance of the Popkin API ([ADR 0009](adr/0009-one-api-instance.md)). Do not scale it
  out: hub groups, presence and the rate limits live in its memory.
- The Popkin Worker, once it hosts a job (journey 9).
- SQL Server.

## Settings

| Setting | Needed by | Without it |
|---|---|---|
| `Database:Provider`, `ConnectionStrings:Popkin` | API, Worker, `popkin` tool | The default is SQL Server on LocalDB, which a deployed system does not have |
| `Auth:CodeHashKey` | API | The API refuses to start outside Development |
| `Invites:BaseUrl` | API | Invite links cannot be built |
| `App:Origin` | API | A change from a client that sends no `Sec-Fetch-Site` is refused with 403 `cross_site_request` |
| `Proxy:KnownProxies`, `Proxy:KnownNetworks` (not built) | API | Every person shares the proxy's address and one allowance of 10 codes per 10 minutes, and the HTTPS redirect can loop ([Abuse limits](detailed-designs/security/abuse-limits/README.md)) |
| `DataProtection:KeysPath` (not built) | API | The session cookie's keys die with the container, and every restart signs everyone out ([Sessions](detailed-designs/accounts/sessions/README.md)) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` (not built) | API, Worker | Nothing is exported; the console log is all there is ([ADR 0012](adr/0012-opentelemetry.md)) |

The SMS and email providers are not chosen: outside Development every code request answers 503
`code_not_sent`. This and the other open decisions are in the
[known gaps](detailed-designs/README.md#known-gaps).

## Release

1. Build the web app (`npm run build` in `frontend/`) and the two images (not built yet).
2. Run `popkin migrate` against the database. The API never migrates on startup.
3. Start the new API, then the Worker. Open hub connections drop and reconnect.

## Probes

- `GET /api/health` — liveness: the process answers. Exists today.
- `GET /api/health/ready` — readiness: the database can be reached (L2-050 AC5). Not built.

## Smoke test

1. `GET /api/health` over HTTPS answers 200 `{ "status": "ok" }`, with HSTS and the content
   security policy on the response.
2. The same request over HTTP is redirected to HTTPS once, not in a loop.
3. The landing page loads, and a deep link such as `/sign-up` loads after a reload.
4. Sign up with a code, start a Popkin and see its QR invite (journey 1).
