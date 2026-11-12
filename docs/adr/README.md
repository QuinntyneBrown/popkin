# Architecture decisions

One record per decision that shapes the code. Read the records for an area before changing it,
and add a record when a decision is made or replaced. A record is never rewritten to say
something else: a new record supersedes it and both say so.

Records 0001 to 0008 are the practices Popkin starts with. They were first decided, and proved,
in Jubilee, whose stack and conventions Popkin
shares.

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

## Format

Each record has the sections Status, Context, Decision and Consequences, in that order, and is
named `NNNN-short-title.md`.
