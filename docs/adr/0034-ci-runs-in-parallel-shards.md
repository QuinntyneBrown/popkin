# 0034. CI runs in parallel shards

## Status

Accepted, 18 November 2026. Amends ADR 0027's estimate of the Playwright job's length.

## Context

By November 2026 a CI run took 10 to 25 minutes, and most runs on main failed. The Playwright
job ran about 1,200 behaviour specs on one machine with two workers for 8 to 11 minutes, and the
API tests ran 952 tests one after another for almost 4 minutes, because they share in-process
state (ADR 0005). Every job also checked out about 600 MB of rendered videos it never read. A
format failure merged with red checks, and specs whose hub events raced the app's catch-up reads
passed only on their retry.

## Decision

- The backend suite runs as four shards in parallel: `units` (every test project but the API's)
  and `api-1`, `api-2`, `api-3`, which split the API tests by namespace; `api-3` takes every
  namespace the other two do not name, so a new one is never left out.
  `pwsh eng/Test-Backend.ps1 -Shard <name>` runs one shard as CI does, and with no `-Shard` the
  whole suite. Each shard still runs its API tests one after another (ADR 0005).
- The behaviour specs run as six Playwright shards (`--shard n/6`) of the same configuration;
  together they are `npm test` (ADR 0006). Each uploads its own report.
- Jobs check out the repository without `docs/videos/` but the pitch film the marketing site
  copies. `node_modules`, the NuGet packages and Playwright's Chromium are cached by their lock
  files.
- A job named `CI` passes only when every other job passed or was skipped, so one status can be
  required of a pull request whatever the shards are.
- CI can be run by hand (`workflow_dispatch`) to prove its stability without a commit; such a run
  deploys nothing.
- A spec that pushes a hub event waits until the app's catch-up read after connecting has been
  answered, so the read cannot overwrite what the event brought (ADR 0010).

## Consequences

- A CI run takes under 5 minutes instead of 10 to 25, and deployment (ADR 0018) starts sooner.
- A run uses about twelve machines instead of four. The repository is public, so the minutes are
  free, but runs of several pull requests at once may queue.
- A shard's namespaces are balanced by hand from measured durations; as namespaces grow, move one
  between `api-1`, `api-2` and `api-3` in `eng/Test-Backend.ps1`.
