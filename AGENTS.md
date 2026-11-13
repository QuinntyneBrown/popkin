## Purpose

> Popkin is a free platform for pop-up communities. Spin up a private space in seconds, invite
> people by QR code, then chat, video call, share photos and rate experiences together.

This is what Popkin is for. Before adding or changing anything, ask how it serves that purpose;
if it does not, do not build it, and if a request works against it, say so.

The mission, Popkin's single L0 requirement, is not written yet. When it is, it goes in
`docs/specs/L0.md` and this section quotes it word for word, never paraphrased; every
requirement, design, mock, line of code and line of copy then points back to it. Do not invent a
mission in its place.

## Project overview

Popkin is a .NET backend, an Angular frontend and a Playwright suite. The .NET backend owns the
data and the rules; the Angular frontend provides the app, and Playwright covers behaviour (and,
run by hand, visual parity with the design reference).

**The first ten journeys are built; the rest is designed.** Journey 1, Start a Popkin, journey
2, Join by invite, journey 3, Chat with everyone, journey 4, Popkin home, journey 5, Share
photos, journey 6, Come back, journey 7, Group call, journey 8, Rate an experience, journey 9,
Wrap up, and journey 10, Discover Popkin, run end to end: the backend has sign up and sign in
with a code, sessions, Popkin creation, the list of a person's Popkins, the invite preview, joining with a name and a photo,
the photo store behind avatars, the Everyone thread, messages, read points, presence, the
SignalR hub `PopkinHub` and the reads of the Popkin home (the header, the chat preview, the
members, the photos summary, and the experiences summary), adding a photo, the album and one
photo, the group call (starting, joining and leaving it, the call under way, each participant's
microphone and camera, the relay of signals through the hub and the media relay's credentials),
experiences (sharing one with a picture, the list and its filter, one experience with the
group's score, rating it, commenting on it, editing and deleting it), wrapping up (the Host's wrap-up and what it will count, the
wrap-up of a Popkin whose time is up, the refusal of every write to a wrapped-up Popkin with
`409` `popkin_wrapped_up`, the end of the call under way, the hub event `PopkinWrappedUp`, the
recap, the album export as a zip, the removal of an album that was not kept, and the crew
invites), with their migrations; the Worker hosts three jobs (`WrapUpDuePopkinsJob`,
`RemovePhotosOfWrappedUpPopkinsJob`, `PrepareAlbumExportsJob`) and sends no hub events
(ADR 0015); the app has the screens of those journeys, the landing page at `/` (behind
`signedOutGuard`, which sends a signed-in person to My Popkins), the welcome screen, the group
chat screen, the Popkin home, the photo album and the photo view, the sign-in screen, My
Popkins, the call screen, Experiences, the experience page, the wrap-up screen and the recap
among them, and no placeholder screen, built for the
five form factors of L2-058, the read-only chat, Photos and Experiences of a wrapped-up Popkin,
the banner of a Popkin's last hour, the invite dialog, the Add photos dialog, the Scan to join
dialog, the dialogs of an experience (Share an experience, Add a comment, its actions and its
deletion), the Popkin settings dialog (Invite people, and Wrap up for the Host), and the
not-found, server-error and offline screens; the `components` library holds the `pk-*`
components they use, the blocks of the landing page (`pk-site-nav`, `pk-site-main`,
`pk-site-footer`, `pk-hero`, `pk-band`, `pk-steps`, `pk-uses`, `pk-compare`, `pk-cta-band`) and
of the welcome screen (`pk-welcome`, `pk-action-pair`, `pk-mark-picture`) among them, each with
a parity spec but `pk-qr` (known gap 56); the `api` library has the chat's stores, the
home's store, the album's stores, the store of My Popkins and its saved list, the QR scanner,
the call session, its peer links (a mesh, ADR 0014) and the call banner's store, the stores of
Experiences and of one experience, the recap's store (`RecapStore`, behind `RECAP_API`), the
wrap-up watch (`WrapUpWatch`) and the wrap-up text (`wrap-up-text.ts`), and the real-time
client, with unit tests of its stores and pure helpers. Everything else exists as documents,
not code: the requirements (`docs/specs/L1.md` and `L2.md`), a mock of every screen in every
state (`docs/mocks/`), the design system (`docs/design-system/`), a detailed design per feature
(`docs/detailed-designs/`) and a prompt per journey (`docs/prompts/`). `docs/estimates/` tracks
how far each design is; read it, not this paragraph, for the current figure.

Before building a feature, read its requirement, its detailed design and its mocks: they exist.
`docs/detailed-designs/README.md` holds the shared architecture, the shared real-time rules and
the register of known gaps, the decisions still open and the journeys each one blocks. Where a
rule below names something that does not exist yet (a command, a fixture, a helper), the first
change that needs it adds it.

Roles, requirements and the journeys to build are in `docs/specs/L1.md` (each traces to
L0-001), `docs/specs/L2.md` and `docs/journeys.md`. Use the words those documents use in code,
docs and UI; do not invent synonyms.

Journeys 1 to 3 filled in the layout below; every later feature follows it.

## Prefer best practice

Where there is more than one way to build something, choose the established best practice of the
platform (Angular, .NET, Playwright, WCAG) over the expedient one (ADR 0007). A departure needs
an ADR that gives its reason. If a rule in this file or in an ADR conflicts with best practice,
say so and propose the correction; do not work around it silently.

## Repository layout

- `backend/` — .NET solution
- `frontend/` — Angular workspace (`popkin`, `api`, `components`)
- `e2e/` — Playwright suite
- `docs/assets/` — the logo and other images the docs share
- `docs/mocks/` — static design reference (the source of truth for the UI)
- `docs/design-system/` — tokens, foundations, components and patterns extracted from the mocks
- `docs/specs/` — requirements (`L0.md` the mission, `L1.md` high level, `L2.md` detailed with
  acceptance criteria)
- `docs/detailed-designs/` — per-feature designs derived from the requirements
- `docs/adr/` — architecture decisions; read relevant ADRs before changing the areas they cover
- `docs/estimates/` — effort and percent complete per design
- `docs/audits/` — audits of the codebase against its rules, each with the fixes it calls for
- `docs/deployment.md` — how Popkin is deployed: the images, every setting, the proxy and a smoke
  test (ADR 0013)
- `docs/personas/` — invented people who come across Popkin, one folder each: who they are,
  their journeys, and their feedback
- `docs/journeys.md`, `docs/prompts/` — the user journeys and one implementation prompt per journey
- `eng/` — local engineering scripts (`Test-Backend.ps1`, `Start-E2eApi.ps1`,
  `Start-E2eWorker.ps1`)
- `docs/videos/` — narrated videos, one folder each; `tools/` holds the scripts that build them

```
popkin/
├── AGENTS.md
├── README.md                          setup and development commands
├── backend/
│   ├── Popkin.sln
│   ├── Directory.Build.props
│   ├── Directory.Packages.props
│   ├── global.json
│   ├── src/
│   │   ├── Popkin.Domain/
│   │   ├── Popkin.Application/
│   │   ├── Popkin.Infrastructure/
│   │   ├── Popkin.Api/
│   │   ├── Popkin.Worker/
│   │   └── Popkin.Cli/
│   └── tests/
│       ├── Popkin.Api.Tests/
│       ├── Popkin.Application.Tests/
│       ├── Popkin.Infrastructure.Tests/   empty until its first test
│       ├── Popkin.Worker.Tests/
│       └── Popkin.Cli.Tests/
├── frontend/
│   ├── angular.json
│   ├── package.json
│   ├── eslint.config.js
│   ├── .prettierrc
│   └── projects/
│       ├── popkin/src/app/            the app
│       │   ├── app.config.ts          composition root
│       │   ├── app.routes.ts
│       │   ├── pages/                 one folder per screen
│       │   ├── dialogs/               CDK dialogs
│       │   ├── guards/
│       │   └── toasts/
│       ├── api/src/lib/               service contracts, implementations, view models, helpers
│       │   ├── api/
│       │   └── models/
│       └── components/src/lib/        every `pk-*` presentation component, one folder each, plus `styles/`
├── e2e/
│   ├── playwright.config.ts
│   ├── fixtures/                      `pk-test.ts`, `routes.ts`, data fixtures
│   ├── pages/                         one page object per screen or dialog
│   └── tests/                         specs, with `visual/` for mock parity
├── eng/
├── docs/
└── .github/workflows/                 `ci.yml`
```

See `README.md` for setup and development commands.

## Backend architecture

Layer dependency direction (strict):

- `Popkin.Domain` — entities + enums, zero deps
- `Popkin.Application` — MediatR handlers, validators, DTO contracts, `IAppDbContext`
- `Popkin.Infrastructure` — `AppDbContext`, EF configurations and migrations, SQL Server / SQLite, auth services
- `Popkin.Api` — controllers, `Program.cs`, DI composition, Swagger, middleware
- `Popkin.Worker` — background jobs. A job is the loop alone: on each tick it sends one MediatR
  request, and the handler holds the rules. The Worker sends no hub events (ADR 0015)
- `Popkin.Cli` — the `popkin` tool: `migrate` / `seed` / `reset`, added with the first migration

Non-obvious rules:

- Business rules live in handlers/domain services, not controllers or hubs. A hub is a
  transport: each hub method checks nothing itself and sends one MediatR request, exactly as a
  controller does. The shared real-time rules are in `docs/detailed-designs/README.md`.
- The API runs as one instance (ADR 0009). State kept in the API's memory (hub groups, presence,
  rate limits) is written for one instance; do not add a second instance without the record that
  supersedes that ADR.
- The API does **not** apply EF migrations on startup. Run `popkin migrate` explicitly. SQLite
  (the local API) and InMemory (tests) have no migrations: the schema comes from the model.
- Seed data is idempotent and safe to re-run.
- Endpoints require authentication by default (fallback policy). Preserve intentional
  `[AllowAnonymous]` access and keep Swagger above `UseAuthentication` when changing API auth.
- Keep request logging outside the exception-handling middleware so handled response statuses
  are logged correctly.
- Forwarded headers are read first in the pipeline and trusted only from the configured proxy
  (`Proxy:KnownProxies`, `Proxy:KnownNetworks`). Nothing else reads `X-Forwarded-*`.
- Telemetry is OpenTelemetry (ADR 0012). Measure with instruments on the `Popkin` meter
  (`PopkinMetrics`), never with hand-rolled counters. No log line, metric dimension or span
  carries a contact detail, a code, a session token, message text, a query string or a body; a
  route is recorded as its template.
- A setting a deployed system needs is added to `docs/deployment.md` in the same change
  (ADR 0013).
- Owned data must stay scoped to its owner: a person sees and changes only their own data and
  the spaces they belong to.
- Errors are ProblemDetails with a `code` extension where a client needs to branch on them.

### Tests

**Mandatory (ADR 0005): backend tests SHALL NOT use a real database.** Every backend test runs on
the EF Core InMemory provider (`Database:Provider=InMemory`, one store per fixture). No test opens
SQLite, LocalDB, SQL Server or a database file. Inject database faults through `IAppDbContext`.
API tests run sequentially (`xunit.runner.json`). Follow the existing test-project patterns when
adding coverage; `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

**A backend test never sleeps** (ADR 0010). It awaits an event, with a timeout that fails naming
what did arrive, or it advances `FakeTimeProvider`; no `Task.Delay` and no `Thread.Sleep`. Hub
tests connect a real SignalR client to `ApiFactory` in memory.

The acceptance test through the API is the proof of each slice. Where a rule has a table of
cases (a read point that never moves back, the units of the time left), add a direct test of the
domain type or handler in the matching test project, one case per row, and keep the API test to
one or two representative paths. That is a behaviour test of a rule, not a test of the
codebase's shape.

## Frontend architecture

Workspace has three projects under `frontend/projects/`: `popkin` (the app), `api` (service
contracts, implementations, view models, pure helpers) and `components` (`pk-*` UI atoms, the
design system). A further application is added by its own ADR (ADR 0002).

### Conventions enforced across the codebase

- Prettier (`frontend/.prettierrc`) owns formatting and angular-eslint (`frontend/eslint.config.js`)
  owns lint; CI fails on either. Run `npm run lint` and `npm run format:check` in `frontend/`. The
  husky pre-commit hook fixes staged frontend files.
- Component selectors use `pk-*`; TypeScript class, file, and folder names omit the `Pk` prefix.
- **Presentation lives in `components` only** (ADR 0007). Every presentation component is built
  in the `components` library and imported by the application projects. An application project
  declares pages, dialogs and its root as containers that compose `pk-*` components; it declares
  no presentation component, no hand-written button, field, alert or dialog frame, no inline
  `style` and no stylesheet. The only classes an application template writes are the layout and
  text utilities (`stack`, `cluster`, `split`, `form-grid`, `container`, `visually-hidden`,
  `truncate`, `text-muted`, `text-caption`, `only-*`).
- **File per type, no single-file components** (ADR 0004, ADR 0007). A library component is
  `name.ts` + `name.html` + `name.scss` using `templateUrl`/`styleUrl`; never an inline `template`
  or `styles`, however short. A page or dialog in an application project is `name.ts` +
  `name.html` and has no stylesheet.
- **One encapsulated stylesheet per component, named with BEM** (ADR 0007). `name.scss` holds
  every rule of its component and nothing else, under Angular's default encapsulation (never
  `ViewEncapsulation.None`). The component is the block, named as in the design system; parts
  are `block__element`, variants are `block--modifier`; a state assistive technology must know is
  an attribute (`aria-current`, `aria-invalid`, `disabled`) and is styled through it. A
  stylesheet never styles another component's block.
- Components preserve the mock design's BEM classes and accessible state semantics; e2e locators
  depend on that parity.
- Global styles are foundations only: tokens, `@font-face`, the reset and the layout and text
  utilities (`components/src/lib/styles/`).
- Read design tokens by role, never hex values; the token set lives in `components`, copied from
  `docs/design-system`. Component-scoped knobs keep the `--pk-` prefix.
- **Fonts are bundled, never left to the system.** When the design system names its faces, the
  font files live in `docs/design-system/assets/fonts/`, are declared by an `@font-face` in
  `tokens.css`, and the app self-hosts the same files.
- **Declare each `ng-content` slot once.** A component that renders `<a>` or `<button>` by
  condition puts its slots in one `<ng-template>` and renders it with `ngTemplateOutlet` in both
  branches; slots repeated per `@if` branch project into one branch only. On the consumer side, a
  `@if` wrapping several `[slot=…]` nodes loses the slot (NG8011): one `@if` per node.
- Logic with many cases (a store, a tracker, a pure helper) lives in the `api` library, where its
  unit tests are (ADR 0011), never in a page.
- API services have a contract and injection token; app pages depend on the token, not the
  concrete implementation. `app.config.ts` is the composition root.
- **No inline forms in pages.** Button-triggered editing always opens a CDK Dialog
  (`frontend/projects/popkin/src/app/dialogs/`) or navigates to a screen.
- Use Angular CDK Dialog/Overlay for modal behaviour; don't hand-roll modals.
- Route data drives the shell: `shell` (`app` | `bare`) picks the chrome, `page` is stamped on
  `<body data-page>` and is the e2e anchor for every screen.
- Every interaction must work with touch on a phone and with the keyboard on a desktop; colour is
  never the only carrier of a state (text, icon or accessible name says it too).

## E2E architecture (Playwright)

- **Mandatory (ADR 0005): e2e tests SHALL NOT execute the real backend or a database.** Every
  `/api/**` request is answered with Playwright API mocking (`page.route`), installed for every
  page by `e2e/fixtures/pk-test.ts` from the recorded answers in `e2e/fixtures/api/responses.json`;
  a request without an answer fails the test. States the recording lacks are stubbed in
  `e2e/fixtures/stubs.ts`. When an endpoint's answer changes, refresh the recording against the
  local API (`eng/Start-E2eApi.ps1`) in the same change; recording is maintenance, never part of
  a test run. The recorder is `npm run record-api` in `e2e/`.
- **The hub is stubbed too (ADR 0010).** No test opens a connection to a real hub: the `page`
  fixture answers `/hubs/**` and routes the hub's WebSocket (`page.routeWebSocket`), one helper
  (`e2e/fixtures/hub.ts`) speaks the SignalR handshake and lets a spec push an event by name, and
  an unstubbed hub request fails the test. The helper exists since journey 3, and a spec reaches it as the `hub` fixture.
- Page Object Model: one page object per screen under `e2e/pages/`, owning the selectors and the
  interactions. Tests state intent; page objects know the DOM. Never put a selector in a test.
- Specs import `test` and `expect` from `e2e/fixtures/pk-test.ts`; routes are keyed in
  `e2e/fixtures/routes.ts` so one spec serves the mocks (`PK_BASELINE=1`) and the app.
- **Mandatory (ADR 0006): only behaviour Playwright tests run.** `npm test` in `e2e/` and the
  CI e2e job run the behaviour specs and nothing else. (The stores and pure helpers of the `api`
  library also have unit tests, `npm test` in `frontend/`, by ADR 0011; pages, dialogs and
  components do not.) The sweeps, visual parity (`e2e/tests/visual/`), responsive
  fit (`responsive.spec.ts`) and automated accessibility (`accessibility.spec.ts`), are still
  written and kept current: give every new screen state its `routes.ts` entry and page-object
  regions, and add a sweep where a requirement calls for one. **Never run them**: no agent or CI
  job runs `npm run sweeps`, `npm run baseline` or anything that sets `PK_SWEEPS=1` or
  `PK_BASELINE=1`; only the repository owner runs them, by hand. Done means the behaviour specs
  pass, not the sweeps.
- **Component parity (ADR 0008).** Every component of the `components` library has a spec in
  `e2e/tests/parity/`, built with `e2e/fixtures/parity.ts`, that compares its region in the app
  with the mock (360 px and 1280 px, both themes, 1 %). `npm run parity` runs these specs and
  nothing else; agents run it, and CI does from the first component on. It is not a sweep: it
  never sets `PK_SWEEPS` or `PK_BASELINE`.
- Visual regression compares the app to `docs/mocks` region by region. Update baselines only for
  intentional design changes, after changing the mock first.
- Run frontend tests in Chromium only. Do not configure or run Firefox, WebKit, or any other
  browser for frontend testing.

## Incremental Implementation and ATDD - mandatory

Mocks and the design system are design artifacts. ATDD does not apply to their development. Do
not write tests for mocks or the design system.

Every new feature or change to production behavior MUST have a requirement, a detailed design,
and a mock before implementation begins. This includes behavioral changes to existing features,
such as changing how a page behaves. This requirement applies to production-code changes only;
documentation-only, design-system-only, mock-only, and test-only changes are out of scope unless
they are part of implementing a production behavior change.

Every production behavior implementation MUST invoke and follow the `implementing-incrementally`
skill (`.claude/skills/implementing-incrementally` and `.agents/skills/implementing-incrementally`)
before any code is written, combined with acceptance test-driven development (ATDD). Plan small,
reviewable slices, then complete one slice at a time: write Given-When-Then acceptance criteria,
write the acceptance test, and run it to prove it fails for the expected reason BEFORE writing
production code. Implement only what satisfies that slice, refactor with tests green, and run the
relevant regression checks. Do not move to the next slice until those checks pass. No bulk
implementation, no tests added afterward, and no weakening tests to manufacture a pass. Keep the
requirement, detailed design, mock, criteria, tests, and implementation aligned until the entire
feature or behavior change is complete.

Back end: integration tests against the API. Front end: Playwright, using the Page Object Model.

### Never write architecture tests

Never add a test that asserts the shape of the codebase rather than its behavior: no structure,
layout, or naming tests; no banned-API scans; no traceability tests that parse the specifications.
Those constraints belong to the compiler, the formatter, and review. A test suite exists to prove
behavior.
