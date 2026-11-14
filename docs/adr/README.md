# Architecture decisions

One record per decision that shapes the code. Read the records for an area before changing it,
and add a record when a decision is made or replaced. A record is never rewritten to say
something else: a new record supersedes it and both say so.

Records 0001 to 0008 are the practices Popkin starts with. They were first decided, and proved,
in Jubilee, whose stack and conventions Popkin
shares. Records 0009 to 0013 come from the audit
[Learnings from BombRMan](../audits/learnings-from-bombrman.md).

| No. | Decision | Status |
|---|---|---|
| [0001](0001-backend-stack.md) | Backend stack: .NET 10, MediatR, EF Core, SQL Server, with SQLite for the local API | Accepted |
| [0002](0002-frontend-workspace.md) | Frontend workspace: three Angular projects built from source, `pk-*` selectors | Accepted |
| [0003](0003-visual-baselines-from-mocks.md) | Visual regression: baselines are rendered from the mocks on each run | Accepted |
| [0004](0004-frontend-file-per-type.md) | Frontend: one file per type, no single-file components (`templateUrl`, never `template`) | Accepted |
| [0005](0005-tests-without-a-backend-or-database.md) | Tests run without a real backend or database: Playwright API mocking for e2e, EF Core InMemory for the backend | Accepted |
| [0006](0006-behaviour-tests-only-by-default.md) | Only behaviour tests run; the visual, responsive and accessibility sweeps run by hand | Accepted |
| [0007](0007-presentation-in-the-components-library.md) | Prefer best practice; presentation only in `components`, one encapsulated `.scss` per component, BEM names | Accepted |
| [0008](0008-component-parity-specs.md) | Component parity specs: `npm run parity`, against the mocks | Accepted |
| [0009](0009-one-api-instance.md) | Popkin runs one API instance; what depends on that and what would end it | Accepted |
| [0010](0010-the-hub-in-tests.md) | The hub in tests: stubbed in Playwright, in memory in the backend; a backend test never sleeps | Accepted |
| [0011](0011-unit-tests-for-frontend-logic.md) | Unit tests for the `api` library's stores and helpers, run in CI | Accepted |
| [0012](0012-opentelemetry.md) | Telemetry: OpenTelemetry for logs, metrics and traces, exported by configuration alone | Accepted |
| [0013](0013-deployment-shape.md) | Deployment: two container images behind one reverse proxy, one origin | Accepted |
| [0014](0014-calls-are-a-mesh.md) | Calls: a mesh of peer connections, signalled through the hub, with a TURN relay by configuration | Accepted |
| [0015](0015-the-worker-sends-no-hub-events.md) | The Worker sends no hub events: a timed wrap-up reaches open screens by the clock | Accepted |
| [0016](0016-admin-app.md) | The admin app: a fourth frontend project at `admin.popkin.community`, admin sessions, feature switches read through one cached service | Accepted |
| [0017](0017-marketing-site.md) | The marketing site: a static Angular project at `about.popkin.community` with the pitch film, linking to the app through one `APP_URL` | Accepted |
| [0018](0018-deploy-to-azure-on-every-commit.md) | Every commit to main is deployed to Azure: Container Apps behind Caddy, Azure SQL, the marketing site on a Static Web App | Accepted |
| [0019](0019-popkin-may-charge.md) | Popkin may charge one day: no claim that it is free; no advertising stays | Accepted |
| [0020](0020-popkin-community-on-front-door.md) | popkin.community: an Azure DNS zone and Azure Front Door with managed certificates; the app at `app` and `*`, the marketing site at the apex and `www` | Accepted |

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
