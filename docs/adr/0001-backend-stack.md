# 0001. Backend stack

## Status

Accepted, 12 November 2026.

## Context

Popkin shares its technical stack with Jubilee. The versions and the choice of database
providers need fixing before the first feature, and `AGENTS.md` requires that no test needs a
database server.

## Decision

- The backend targets .NET 10 (`backend/global.json`), with central package versions in
  `backend/Directory.Packages.props` and warnings treated as errors.
- Handlers use MediatR 12, the last line under the Apache 2.0 licence. Later versions need a
  licence key, which the project does not have.
- EF Core is the only data access. `Database:Provider` chooses SQL Server (the default, with
  migrations applied by `popkin migrate`), SQLite or InMemory.
- SQLite has no migrations: the schema comes from the model. `eng/Start-E2eApi.ps1` starts the
  API on SQLite.
- InMemory exists for tests only (ADR 0005) and is never configured for a running service.

## Consequences

- A query must translate on SQL Server and on SQLite.
- Behaviour that only SQL Server has (for example full-text search) needs a test double or a
  second strategy when a feature calls for it.
- Moving to a later MediatR is a licensing decision, not a technical one.
