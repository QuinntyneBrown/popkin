## Purpose

> Popkin is a platform for pop-up communities. Spin up a private space in seconds, invite
> people by QR code, then chat, video call, share photos and rate experiences together.

Before adding or changing anything, ask how it serves that purpose; if it does not, do not build
it, and if a request works against it, say so.

The mission, Popkin's single L0 requirement, is not written yet. When it is, it goes in
`docs/specs/L0.md` and this section quotes it word for word; everything then points back to it.
Do not invent a mission in its place.

## Where things are

- The code is a .NET backend (`backend/`), an Angular workspace (`frontend/`: `popkin` the app,
  `marketing`, `api`, `components`) and a Playwright suite (`e2e/`). `README.md` has setup and
  commands. `docs/estimates/` says what is built; the code is the inventory.
- Before building a feature, read its requirement (`docs/specs/L1.md`, `L2.md`,
  `docs/journeys.md`), its detailed design (`docs/detailed-designs/`) and its mocks
  (`docs/mocks/`, the source of truth for the UI; `docs/design-system/` is extracted from them).
  `docs/detailed-designs/README.md` holds the shared architecture, the shared real-time rules
  and the register of known gaps and open decisions.
- Read the relevant ADRs in `docs/adr/` before changing the areas they cover.
- Where a rule below names something that does not exist yet (a command, a fixture, a helper),
  the first change that needs it adds it.

Use the words the specs use in code, docs and UI; no synonyms. A Popkin gathers for any kind of
event: the tab where it plans is "Plan", and nothing is named "trip".

## Prefer best practice

Choose the platform's established best practice (Angular, .NET, Playwright, WCAG) over the
expedient way (ADR 0007). A departure needs an ADR giving its reason. If a rule here or in an ADR
conflicts with best practice, say so and propose the correction; do not work around it silently.

## Backend

Layer dependency direction (strict): `Popkin.Domain` (entities, enums, zero deps) ←
`Popkin.Application` (MediatR handlers, validators, DTOs, `IAppDbContext`) ←
`Popkin.Infrastructure` (EF, migrations, auth services) ← `Popkin.Api` / `Popkin.Worker` /
`Popkin.Cli` (`popkin migrate | seed | reset`).

- Business rules live in handlers/domain services. A controller, a hub method and a Worker job
  each check nothing themselves and send one MediatR request. The Worker sends no hub events
  (ADR 0015).
- The API runs as one instance (ADR 0009); in-memory state (hub groups, presence, rate limits)
  assumes it. Do not add a second instance without a superseding ADR.
- The API does **not** apply migrations on startup; run `popkin migrate`. SQLite (local) and
  InMemory (tests) take the schema from the model. Seed data is idempotent.
- Endpoints require authentication by default (fallback policy). Preserve intentional
  `[AllowAnonymous]` access and keep Swagger above `UseAuthentication`.
- Keep request logging outside the exception-handling middleware so handled statuses are logged.
- Forwarded headers are read first and trusted only from `Proxy:KnownProxies` /
  `Proxy:KnownNetworks`. Nothing else reads `X-Forwarded-*`.
- Telemetry is OpenTelemetry (ADR 0012): instruments on the `Popkin` meter (`PopkinMetrics`),
  never hand-rolled counters. No log, metric dimension or span carries a contact detail, a code,
  a session token, message text, a query string or a body; a route is recorded as its template.
- A setting a deployed system needs goes in `docs/deployment.md` in the same change (ADR 0013).
  Every commit to main deploys to Azure (ADR 0018).
- A person sees and changes only their own data and the Popkins they belong to.
- Errors are ProblemDetails with a `code` extension where a client branches on them.

### Backend tests

- **No real database (ADR 0005).** Every test runs on EF Core InMemory
  (`Database:Provider=InMemory`, one store per fixture); never SQLite, LocalDB, SQL Server or a
  file. Inject database faults through `IAppDbContext`. API tests run sequentially.
- **Never sleep (ADR 0010).** Await an event with a timeout that fails naming what did arrive, or
  advance `FakeTimeProvider`; no `Task.Delay`, no `Thread.Sleep`. Hub tests connect a real
  SignalR client to `ApiFactory` in memory.
- The acceptance test through the API proves each slice. A rule with a table of cases also gets a
  direct test of the domain type or handler, one case per row, with the API test kept to one or
  two representative paths.
- `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

## Frontend

A further application is added only by its own ADR (ADR 0002). The marketing site (ADR 0017) is
static: one root composing `pk-*` components, copy in `content.ts`, links to the app built from
`APP_URL`, no API request.

- Prettier and angular-eslint own formatting and lint; CI fails on either (`npm run lint`,
  `npm run format:check` in `frontend/`).
- Selectors are `pk-*`; class, file and folder names omit the `Pk` prefix.
- **Presentation lives in `components` only (ADR 0007).** Application projects declare pages,
  dialogs and a root as containers composing `pk-*` components: no presentation component, no
  hand-written button, field, alert or dialog frame, no inline `style`, no stylesheet. The only
  classes an application template writes are the utilities `stack`, `cluster`, `split`,
  `form-grid`, `container`, `visually-hidden`, `truncate`, `text-muted`, `text-sm`,
  `text-caption`, `only-*`.
- **File per type (ADR 0004).** A library component is `name.ts` + `name.html` + `name.scss` with
  `templateUrl`/`styleUrl`, never inline `template`/`styles`. A page or dialog is `name.ts` +
  `name.html` only.
- **One encapsulated BEM stylesheet per component.** Default encapsulation, never
  `ViewEncapsulation.None`. The component is the block, named as in the design system;
  `block__element`, `block--modifier`; a state assistive technology must know is an attribute
  (`aria-current`, `aria-invalid`, `disabled`) and is styled through it. Never style another
  component's block. Keep the mocks' BEM classes: e2e locators depend on them.
- Global styles are foundations only (tokens, `@font-face`, reset, utilities) in
  `components/src/lib/styles/`. Read tokens by role, never hex; component knobs keep `--pk-`.
- Fonts are bundled: files in `docs/design-system/assets/fonts/`, `@font-face` in `tokens.css`,
  self-hosted by the app.
- **Declare each `ng-content` slot once.** A component rendering `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` rendered with `ngTemplateOutlet` in both
  branches. A consumer `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if`
  per node.
- Logic with many cases (a store, a tracker, a pure helper) lives in the `api` library with its
  unit tests (ADR 0011), never in a page.
- API services have a contract and an injection token; pages depend on the token.
  `app.config.ts` is the composition root.
- **No inline forms in pages.** Button-triggered editing opens a CDK Dialog (`app/dialogs/`) or
  navigates to a screen. Never hand-roll modals.
- Route data drives the shell: `shell` (`app` | `bare`) picks the chrome; `page` is stamped on
  `<body data-page>` and is the e2e anchor of every screen.
- Every interaction works by touch on a phone and by keyboard on a desktop; colour is never the
  only carrier of a state.

## E2E (Playwright)

- **No real backend or database (ADR 0005).** `e2e/fixtures/pk-test.ts` answers every `/api/**`
  request from `e2e/fixtures/api/responses.json`; an unanswered request fails the test. States
  the recording lacks are stubbed in `e2e/fixtures/stubs.ts`. When an endpoint's answer changes,
  re-record against the local API (`eng/Start-E2eApi.ps1`, then `npm run record-api` in `e2e/`)
  in the same change; recording is never part of a test run.
- **The hub is stubbed too (ADR 0010)** through the `hub` fixture (`e2e/fixtures/hub.ts`), which
  speaks the SignalR handshake and pushes events by name; an unstubbed hub request fails.
- Page Object Model: one page object per screen or dialog in `e2e/pages/` owns the selectors.
  Never put a selector in a test. Specs import `test`/`expect` from `pk-test.ts`; routes are
  keyed in `e2e/fixtures/routes.ts`.
- **Only behaviour specs run (ADR 0006)**: `npm test` in `e2e/`. Sweeps (visual parity,
  `responsive.spec.ts`, `accessibility.spec.ts`) are written and kept current: give every new
  screen state its `routes.ts` entry and page-object regions. **Never run them**: no agent runs
  `npm run sweeps`, `npm run baseline`, or anything setting `PK_SWEEPS=1` or `PK_BASELINE=1`.
- **Component parity (ADR 0008).** Every `components` component has a spec in
  `e2e/tests/parity/` built with `e2e/fixtures/parity.ts`. Agents run `npm run parity`.
- Update visual baselines only for intentional design changes, after changing the mock first.
- Chromium only; never configure or run another browser.

## Incremental implementation and ATDD (mandatory)

Every new feature or change to production behaviour needs a requirement, a detailed design and a
mock before implementation. Documentation-, design-system-, mock- and test-only changes are
exempt, and mocks and the design system get no tests.

Before writing any code, invoke and follow the `implementing-incrementally` skill, with ATDD:
plan small slices and finish one at a time. For each, write Given-When-Then criteria, write the
acceptance test (backend: through the API; frontend: Playwright with page objects), run it to
prove it fails for the expected reason, then implement only that slice, refactor green and run
the regression checks before the next. No bulk implementation, no tests added afterwards, no
weakening tests to pass. Keep requirement, design, mock, tests and code aligned throughout.

Never write architecture tests: no structure, layout, naming, banned-API or spec-traceability
tests. A test suite proves behaviour.
