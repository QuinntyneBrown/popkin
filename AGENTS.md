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

**The repository is a scaffold.** It holds the layout, the conventions, a backend that answers
`GET /api/health`, an app with one placeholder screen and one behaviour spec. There are no
requirements, mocks or design system yet: the folders under `docs/` are empty. The rules below
apply from the first feature on; where a rule names something that does not exist yet (a
command, a fixture, a stylesheet), the first change that needs it adds it.

Roles, requirements and the journeys to build will be in `docs/specs/L1.md` (each traces to
L0-001), `docs/specs/L2.md` and `docs/journey.md`. Use the words those documents use in code,
docs and UI; do not invent synonyms.

The first journey to be implemented fills in the layout below; every later feature follows it.
`docs/estimates/` tracks how far each design is.

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
- `docs/personas/` — invented people who come across Popkin, one folder each: who they are,
  their journeys, and their feedback
- `docs/journey.md`, `docs/prompts/` — the user journeys and one implementation prompt per journey
- `eng/` — local engineering scripts (`Test-Backend.ps1`, `Start-E2eApi.ps1`)
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
│       ├── Popkin.Application.Tests/      empty until its first test
│       ├── Popkin.Infrastructure.Tests/   empty until its first test
│       ├── Popkin.Worker.Tests/           empty until its first test
│       └── Popkin.Cli.Tests/              empty until its first test
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
- `Popkin.Worker` — background jobs
- `Popkin.Cli` — the `popkin` tool: `migrate` / `seed` / `reset`, added with the first migration

Non-obvious rules:

- Business rules live in handlers/domain services, not controllers.
- The API does **not** apply EF migrations on startup. Run `popkin migrate` explicitly. SQLite
  (the local API) and InMemory (tests) have no migrations: the schema comes from the model.
- Seed data is idempotent and safe to re-run.
- Endpoints require authentication by default (fallback policy). Preserve intentional
  `[AllowAnonymous]` access and keep Swagger above `UseAuthentication` when changing API auth.
- Keep request logging outside the exception-handling middleware so handled response statuses
  are logged correctly.
- Owned data must stay scoped to its owner: a person sees and changes only their own data and
  the spaces they belong to.
- Errors are ProblemDetails with a `code` extension where a client needs to branch on them.

### Tests

**Mandatory (ADR 0005): backend tests SHALL NOT use a real database.** Every backend test runs on
the EF Core InMemory provider (`Database:Provider=InMemory`, one store per fixture). No test opens
SQLite, LocalDB, SQL Server or a database file. Inject database faults through `IAppDbContext`.
API tests run sequentially (`xunit.runner.json`). Follow the existing test-project patterns when
adding coverage; `pwsh eng/Test-Backend.ps1` runs the suite as CI does.

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
  a test run. The recorder (`npm run record-api` in `e2e/`) is added with the first endpoint the
  app calls.
- Page Object Model: one page object per screen under `e2e/pages/`, owning the selectors and the
  interactions. Tests state intent; page objects know the DOM. Never put a selector in a test.
- Specs import `test` and `expect` from `e2e/fixtures/pk-test.ts`; routes are keyed in
  `e2e/fixtures/routes.ts` so one spec serves the mocks (`PK_BASELINE=1`) and the app.
- **Mandatory (ADR 0006): only behaviour Playwright tests run.** `npm test` and CI run the
  behaviour specs and nothing else. The sweeps, visual parity (`e2e/tests/visual/`), responsive
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
