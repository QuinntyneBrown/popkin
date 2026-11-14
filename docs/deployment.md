# Deployment

How Popkin is deployed, by [ADR 0013](adr/0013-deployment-shape.md) and
[ADR 0018](adr/0018-deploy-to-azure-on-every-commit.md). **Every commit to `main` that passes CI
is deployed to Azure** by the `Deploy` workflow (`.github/workflows/deploy.yml`). The images,
the infrastructure (`infra/`) and the release are built; the forwarded-header handling, the
readiness endpoint and the telemetry set-up are decided and designed, not coded. Each section
says what it waits for. Keep this document true: a setting added to the code is added here, and
in `infra/main.bicep`, in the same change.

## Azure

| Part | Azure resource | Notes |
|---|---|---|
| The app and its reverse proxy | Container App `popkin-web` | Image `popkin-web` (`infra/web/`): Caddy serving the built app and forwarding `/api` and `/hubs`; public, HTTPS only |
| The API | Container App `popkin-api` | Image `popkin-api`; exactly one replica; inside the environment only; its init container runs `popkin migrate` |
| The Worker | Container App `popkin-worker` | Image `popkin-worker`; exactly one replica; no ingress |
| The database | Azure SQL Database `popkin` (Basic) | Microsoft Entra authentication only; the apps' identity `id-popkin` signs in with no password |
| The marketing site | Static Web App `swa-popkin-marketing` (Free) | Its own public address; built with the app's address as `APP_URL` |
| The images | Container registry `popkin<suffix>` (Basic) | Tagged with the commit; pulled by `id-popkin` |
| Logs | Log Analytics workspace `log-popkin` | The console log of every container |

All of it is in the resource group `rg-popkin`, in East US 2 but for the database, in Central US:
East US 2 and East US take no new Azure SQL servers (`sqlLocation` in `infra/main.bicep`). To set up a new subscription or
repository, run `eng/Initialize-Azure.ps1` once with `az` and `gh` signed in: it creates the
resource group, the Entra application `popkin-github-deploy` that GitHub signs in as through
OpenID Connect, its roles, and the GitHub environment `production` with these entries:

| Name | Kind | Holds |
|---|---|---|
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | Variables | Who the workflow signs in as, and where |
| `AZURE_RESOURCE_GROUP` | Variable | `rg-popkin` |
| `AUTH_CODE_HASH_KEY` | Secret | `Auth:CodeHashKey`, generated once |
| `PHOTOS_SIGNING_KEY` | Secret | `Photos:SigningKey`, generated once |

The addresses of the app and the marketing site are in the summary of each Deploy run.

## Shape

- One reverse proxy on one origin. It serves the built web app
  (`frontend/dist/popkin/browser`, with `index.html` as the fallback for app routes) and forwards
  `/api` and `/hubs` to the API, with WebSockets allowed on `/hubs`. Product: Caddy
  (`infra/web/Caddyfile`), behind the Container Apps ingress, which ends TLS (ADR 0018).
- The marketing site ([ADR 0017](adr/0017-marketing-site.md)), published on its own, as an
  Azure Static Web App: the static files of `frontend/dist/marketing/browser`, built after
  `npm run media:sync`, which copies the pitch film and its pictures in first, with its headers in
  `staticwebapp.config.json`. It needs no setting at run time; the app's address its links use is
  built in: `POPKIN_APP_URL` when the build defines it, `https://popkin.community` otherwise
  (`environment.ts`). Nothing on that host reaches `/api` or `/hubs`.
- **One** instance of the Popkin API ([ADR 0009](adr/0009-one-api-instance.md)). Do not scale it
  out: hub groups, presence and the rate limits live in its memory.
- **One** instance of the Popkin Worker. It must run: it wraps up the Popkins whose time is up
  (every 30 seconds), removes the photos of a Popkin wrapped up without its album after 30 days
  (every hour), prepares the zip behind "Save the album" (every 2 seconds) and erases the
  personal data of deleted accounts (every day). Without it a Popkin with an end date never wraps
  up by itself, an album export stays "Preparing" and a deleted account is not erased within the
  30 days L2-049 promises. It
  reads and writes the same database **and the same photo store** as the API: the zip it writes
  is the file the API hands out. It serves no HTTP and sends no hub events; a screen that is
  open learns of a timed wrap-up from its own clock check
  ([known gap 13](detailed-designs/README.md#known-gaps)).
- SQL Server: Azure SQL Database, with Microsoft Entra authentication alone.

## Settings

| Setting | Needed by | Without it |
|---|---|---|
| `Database:Provider`, `ConnectionStrings:Popkin` | API, Worker, `popkin` tool | The default is SQL Server on LocalDB, which a deployed system does not have |
| `Auth:CodeHashKey` | API, Worker | Each refuses to start outside Development |
| `Invites:BaseUrl` | API | Invite links cannot be built |
| `Photos:SigningKey` | API, Worker | Each refuses to start outside Development; with it, every photo address, and the address an album's zip downloads from, is signed and expires after an hour ([Join a Popkin](detailed-designs/invitations/join-popkin/README.md)). The API signs and checks; give the Worker the same value |
| `Photos:Root` | API, Worker, Development only | Photo files go to a `popkin-photos` folder in the machine's temporary folder. The API and the Worker must name the same folder |
| `App:Origin` | API | A change from a client that sends no `Sec-Fetch-Site` is refused with 403 `cross_site_request` |
| `MediaRelay:Urls` (a list: `MediaRelay:Urls:0`, `MediaRelay:Urls:1`, …) | API | A participant is handed no STUN or TURN server, so a group call connects only between browsers that reach each other directly, as on one machine or one network ([Group call](detailed-designs/calls/group-call/README.md)) |
| `MediaRelay:Secret` | API | The servers of `MediaRelay:Urls` are handed out without a username or a credential, which a STUN server accepts and a TURN server refuses. It is the shared secret of the relay's TURN REST scheme (`use-auth-secret` and `static-auth-secret` in coturn): the API signs `{expiry}:{membershipId}` with HMAC-SHA1 and never calls the relay |
| `MediaRelay:CredentialLifetime` | API | A TURN credential lives one hour (`01:00:00`); a value that is not a length of time stops the API at startup |
| `Proxy:KnownProxies`, `Proxy:KnownNetworks` (not built) | API | Every person shares the proxy's address and one allowance of 10 codes per 10 minutes, and the HTTPS redirect can loop ([Abuse limits](detailed-designs/security/abuse-limits/README.md)) |
| `DataProtection:KeysPath` (not built) | API | The session cookie's keys die with the container, and every restart signs everyone out ([Sessions](detailed-designs/accounts/sessions/README.md)) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` (not built) | API, Worker | Nothing is exported; the console log is all there is ([ADR 0012](adr/0012-opentelemetry.md)) |

The SMS and email providers are not chosen: outside Development every code request answers 503
`code_not_sent`. The photo store provider is not chosen either: outside Development a join with
a photo fails, and a join without one works; the same holds for the album, where adding a photo
fails. No setting was added for the album. Journey 9 added no setting either: outside
Development an album export fails for want of a photo store, and "Pop up another with this crew"
is accepted and sends no invite for want of an SMS or email provider. The Worker has no probe;
its heartbeat is the gauge `popkin.wrap_up.last_tick` on the `Popkin` meter, which stops rising
when it stops ticking, and `popkin.wrap_up.lateness` measures how long after its end date each
Popkin was wrapped up ([ADR 0012](adr/0012-opentelemetry.md)). The media relay provider is not chosen either: any
STUN/TURN server that takes the shared-secret scheme fits the three `MediaRelay` settings, and
the proxy must allow hub messages of up to 64 KB on `/hubs`, the size of the largest call signal.
This and the other open decisions are in the [known gaps](detailed-designs/README.md#known-gaps).

## Release

The Deploy workflow does each step, in order:

1. Deploy `infra/registry.bicep`, then build and push the three images, tagged with the commit:
   `popkin-api` (`backend/src/Popkin.Api/Dockerfile`, with the `popkin` tool in `/app/cli`),
   `popkin-worker` (`backend/src/Popkin.Worker/Dockerfile`) and `popkin-web`
   (`infra/web/Dockerfile`, which builds the web app).
2. Deploy `infra/main.bicep`. The new API revision's init container runs `popkin migrate`
   against the database before the API starts; the API never migrates on startup.
3. The new API starts, then the Worker. Open hub connections drop and reconnect.
4. Build the marketing site (`npm run media:sync`, then `ng build marketing --define
   "POPKIN_APP_URL='<the app's address>'"`) and publish it to its Static Web App.
5. Run steps 1 to 3 of the smoke test.

To deploy `main` again without a commit, run the Deploy workflow by hand.

## Probes

- `GET /api/health` — liveness: the process answers. Exists today.
- `GET /api/health/ready` — readiness: the database can be reached (L2-050 AC5). Not built.

## Smoke test

1. `GET /api/health` over HTTPS answers 200 `{ "status": "ok" }`, with HSTS and the content
   security policy on the response.
2. The same request over HTTP is redirected to HTTPS once, not in a loop.
3. The landing page loads, and a deep link such as `/sign-up` loads after a reload.
4. Sign up with a code, start a Popkin and see its QR invite (journey 1).
5. Open the invite link in a private window, sign up as someone else and join (journey 2).
