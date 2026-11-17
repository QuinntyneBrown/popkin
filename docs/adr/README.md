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
| [0007](0007-presentation-in-the-components-library.md) | Prefer best practice; presentation only in `components`, one encapsulated `.scss` per component, BEM names | Accepted, amended by 0029 |
| [0008](0008-component-parity-specs.md) | Component parity specs: `npm run parity`, against the mocks | Accepted, amended by 0025 and 0027 |
| [0009](0009-one-api-instance.md) | Popkin runs one API instance; what depends on that and what would end it | Accepted |
| [0010](0010-the-hub-in-tests.md) | The hub in tests: stubbed in Playwright, in memory in the backend; a backend test never sleeps | Accepted |
| [0011](0011-unit-tests-for-frontend-logic.md) | Unit tests for the `api` library's stores and helpers, run in CI | Accepted |
| [0012](0012-opentelemetry.md) | Telemetry: OpenTelemetry for logs, metrics and traces, exported by configuration alone | Accepted |
| [0013](0013-deployment-shape.md) | Deployment: two container images behind one reverse proxy, one origin | Accepted |
| [0014](0014-calls-are-a-mesh.md) | Calls: a mesh of peer connections, signalled through the hub, with a TURN relay by configuration | Accepted |
| [0015](0015-the-worker-sends-no-hub-events.md) | The Worker sends no hub events: a timed wrap-up reaches open screens by the clock | Accepted |
| [0016](0016-admin-app.md) | The admin app: a fourth frontend project at `admin.popkin.community`, admin sessions, feature switches read through one cached service | Accepted, amended by 0024 |
| [0017](0017-marketing-site.md) | The marketing site: a static Angular project at `about.popkin.community` with the pitch film, linking to the app through one `APP_URL` | Accepted |
| [0018](0018-deploy-to-azure-on-every-commit.md) | Every commit to main is deployed to Azure: Container Apps behind Caddy, Azure SQL, the marketing site on a Static Web App | Accepted |
| [0019](0019-popkin-may-charge.md) | Popkin may charge one day: no claim that it is free; no advertising stays | Accepted |
| [0020](0020-popkin-community-on-front-door.md) | popkin.community: an Azure DNS zone and Azure Front Door with managed certificates; the app at `app` and `*`, the marketing site at the apex and `www` | Accepted |
| [0021](0021-codes-and-invites-by-azure-communication-services.md) | Codes and crew invites are sent by Azure Communication Services: SMS from a toll-free number, email from `popkin.community`, signed in with the managed identity | Accepted |
| [0022](0022-photos-in-azure-blob-storage.md) | Photo files are kept in a private Azure Blob Storage container, signed in with the managed identity; the API still signs and serves every address | Accepted |
| [0023](0023-features-switched-on-by-a-setting.md) | A feature that is not ready is switched on by an API setting under `Features:`, which the API enforces and the app asks for before a screen opens | Accepted (0030 set it aside for the admin app until 17 November 2026) |
| [0024](0024-admins-moderation-and-switches-in-the-database.md) | Admins, moderation and feature switches are kept in the database: admin roles and sessions, an audit log in the same transaction, moderation only through reports and a recorded view, switches Off, chosen or everyone | Accepted, amended by 0026 |
| [0025](0025-library-components-ahead-of-their-screens.md) | Library components may be built ahead of their screens: their parity spec and acceptance test come with the first screen that uses them | Accepted, amended by 0029 |
| [0026](0026-the-host-chooses-a-popkins-features.md) | The Host chooses a Popkin's features within what the admin app offers: on only while offered and switched on, a row only for a feature switched off | Accepted |
| [0027](0027-parity-specs-run-by-hand.md) | The component parity specs run by hand with `npm run parity`; CI runs the behaviour specs only | Accepted |
| [0028](0028-phone-reminders-by-web-push.md) | Phone reminders are sent by Web Push, signed with VAPID by the Worker | Accepted |
| [0029](0029-one-library-no-unused-components.md) | One component library: a component exists only while a screen uses it, look-alikes merge only where the mocks draw one block, and logic the apps share lives once in `api` | Accepted |
| [0030](0030-admin-notifications-on-a-fake-backend.md) | The admin app's Notifications page runs on a fake backend, an interceptor switched on by one build-time setting and off in e2e, until the API serves it | Ended 17 November 2026: the API serves it |
| [0031](0031-notification-emails-by-razor-components.md) | Notification emails are Razor components rendered with `HtmlRenderer`, one shared shell, every member's text encoded | Accepted |
| [0032](0032-one-data-protection-key-ring-in-blob-storage.md) | One Data Protection key ring for the API and the Worker, kept in Blob Storage and wrapped by Key Vault | Accepted |

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
