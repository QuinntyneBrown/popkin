<h1 align="center">Popkin</h1>

<p align="center">
  <strong>A free platform for pop-up communities.</strong>
</p>

<p align="center">
  <a href="https://github.com/QuinntyneBrown/popkin/actions/workflows/ci.yml"><img src="https://github.com/QuinntyneBrown/popkin/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <img src="https://img.shields.io/badge/.NET-10-512BD4.svg" alt=".NET 10">
  <img src="https://img.shields.io/badge/Angular-22-DD0031.svg" alt="Angular 22">
  <img src="https://img.shields.io/badge/tested%20with-Playwright-2EAD33.svg" alt="Tested with Playwright">
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="Pull requests welcome"></a>
</p>

<p align="center">
  <a href="#getting-started">Getting started</a> ·
  <a href="docs/adr/README.md">Architecture decisions</a> ·
  <a href="AGENTS.md">Rules</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

Popkin is a free platform for pop-up communities. Spin up a private space in seconds, invite
people by QR code, then chat, video call, share photos and rate experiences together.

> **Status: in progress.** Journey 1, Start a Popkin, is built: sign up with a code, name a
> Popkin, choose how long it lasts and get its QR invite, on every screen size from a phone to a
> desktop. [Watch it](docs/videos/01-journey-01-start-a-popkin/01-journey-01-start-a-popkin.mp4)
> (1 min 48 s, with sound). Journey 2, Join by invite, is built too: open an invite link, see
> what you are joining, join with a name and an optional photo, and be welcomed.
> [Watch it](docs/videos/02-journey-02-join-by-invite/02-journey-02-join-by-invite.mp4)
> (2 min 14 s, with sound). Journey 3, Chat with everyone, is built as well: members read the
> Everyone thread by day, send messages that reach the others as they are sent, and keep a
> message that cannot be sent, marked "Not sent" or "Waiting to send".
> [Watch it](docs/videos/03-journey-03-chat-with-everyone/03-journey-03-chat-with-everyone.mp4)
> (2 min 10 s, with sound). Journey 4, Popkin home, is built too: a member sees who is in the
> Popkin, how long it has left and the latest chat, with the count of new messages rising as
> they arrive, and brings someone in with the QR code or the invite link.
> [Watch it](docs/videos/04-journey-04-popkin-home/04-journey-04-popkin-home.mp4)
> (2 min 12 s, with sound). Journey 5, Share photos, is built as well: members add up to 20
> photos at a time with captions, browse the album by day under Everyone or Mine, and open each
> photo full screen, and new photos appear for everyone without a reload.
> [Watch it](docs/videos/05-journey-05-share-photos/05-journey-05-share-photos.mp4)
> (2 min 16 s, with sound). Journey 6, Come back, is built too: a person signs in again with
> a new code, sees every Popkin they belong to on My Popkins, with the latest message and the
> count of unread messages on each, opens any of them, and scans a QR code to join another;
> offline, My Popkins shows the list it saved last time.
> [Watch it](docs/videos/06-journey-06-come-back/06-journey-06-come-back.mp4)
> (2 min 22 s, with sound). Journey 7, Group call, is built as well: a member starts a video
> call for the whole Popkin with one tap, the others join from a banner on the home and in the
> chat, and each mutes, turns the camera off, leaves, or minimises the call and returns to it;
> whoever is speaking has a ring round their tile.
> [Watch it](docs/videos/07-journey-07-group-call/07-journey-07-group-call.mp4)
> (2 min 16 s, with sound). Journey 8, Rate an experience, is built too: members share what
> the group did, where it ate and what it wants to do next, with a picture, filter the list, rate
> each one from one to five stars, add a few words to their rating and see the group's score;
> whoever shared an experience edits or deletes it.
> [Watch it](docs/videos/08-journey-08-rate-an-experience/08-journey-08-rate-an-experience.mp4)
> (2 min 12 s, with sound). Journey 9, Wrap up, is built as well: the Host wraps a Popkin up
> from Popkin settings, or its time runs out, with a banner in its last hour; it turns
> read-only, and everyone gets a recap with the people, the messages, the photos and the
> top-rated moment, saves the album as a zip, and the Host pops up another with the same crew.
> [Watch it](docs/videos/09-journey-09-wrap-up/09-journey-09-wrap-up.mp4)
> (2 min 20 s, with sound). Journey 10, Discover Popkin, is built too: a visitor reads on the
> landing page what Popkin is, how it works, what it is for, how it compares with a group chat
> and that it is free, and starts a Popkin or signs in from there; a person who is signed in
> goes straight to My Popkins.
> [Watch it](docs/videos/10-journey-10-discover-popkin/10-journey-10-discover-popkin.mp4)
> (2 min 26 s, with sound).
> The journeys still to build are in
> [`docs/journeys.md`](docs/journeys.md), each with its prompt in [`docs/prompts/`](docs/prompts/).

## Contents

- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Building and testing](#building-and-testing)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Architecture

| Part | Technology | Responsibility |
|---|---|---|
| `backend/` | .NET 10, ASP.NET Core, SignalR, EF Core, MediatR | The data and the rules, behind an HTTP API and the hub that carries live updates |
| `frontend/` | Angular 22, Angular CDK | The app (`popkin`), service contracts (`api`) and `pk-*` UI atoms (`components`) |
| `e2e/` | Playwright (Chromium) | Behaviour tests against the app, with every `/api` request answered from a recording and the hub stubbed |
| `docs/` | Markdown, HTML, PlantUML | Requirements, mocks, design system, detailed designs and architecture decisions |

The backend layers depend in one direction only: `Domain` ← `Application` ← `Infrastructure` ←
`Api` / `Worker` / `Cli`. The rules behind that, and the frontend and end-to-end conventions, are
in [`AGENTS.md`](AGENTS.md) and the [architecture decision records](docs/adr/README.md).

## Getting started

### Prerequisites

| Tool | Version | Notes |
|---|---|---|
| [.NET SDK](https://dotnet.microsoft.com/download) | 10.0 | Pinned by [`backend/global.json`](backend/global.json) |
| [Node.js](https://nodejs.org) | 22 | npm 10 |
| [PowerShell](https://learn.microsoft.com/powershell/) | 7 (`pwsh`) | Runs the scripts in `eng/` |
| SQL Server | Any supported edition | Optional; the default provider of a deployed API |

The quick start runs on SQLite, and the tests need no database at all
([ADR 0005](docs/adr/0005-tests-without-a-backend-or-database.md)).

Making a video ([`docs/videos/README.md`](docs/videos/README.md)) also needs ffmpeg with libx264
and libmp3lame on the path (`FFMPEG_PATH` overrides) and Python 3.10 or later with `kokoro-onnx`
and `numpy` in a virtual environment. The Kokoro voice model (about 310 MB) is downloaded once
into `.cache/kokoro`; Playwright and Chromium are the copies in `e2e/`.

```shell
python3.12 -m venv .cache/video-venv
.cache/video-venv/bin/pip install kokoro-onnx numpy
```

### Quick start

1. Clone the repository and install the frontend and end-to-end dependencies.

   ```shell
   git clone https://github.com/QuinntyneBrown/popkin.git
   cd popkin
   npm ci --prefix frontend
   npm ci --prefix e2e
   ```

2. Start the API. It listens on `http://localhost:5080`, uses SQLite and needs no database
   server. The script makes and seeds a fresh database with `popkin reset` first. Every code it
   issues is `482913` and is written to the log, not sent: the SMS and email providers are not
   chosen yet.

   ```shell
   pwsh eng/Start-E2eApi.ps1
   ```

3. In a second terminal, start the app and open `http://localhost:4200`. The development server
   sends `/api` and `/hubs` to the API.

   ```shell
   npm start --prefix frontend
   ```

With the two running, chat works locally: start a Popkin, open its invite link in a second
browser profile, join, and each side sees the other's messages in the Everyone thread as they
are sent.

4. To see what the Worker does (a Popkin wrapping up when its time is up, "Save the album"
   becoming a zip to download), start it in a third terminal. It uses the database and the photo
   folder of the API started in step 2.

   ```shell
   pwsh eng/Start-E2eWorker.ps1
   ```

### The database and the `popkin` tool

The API never changes the database schema on startup. The `popkin` tool
(`backend/src/Popkin.Cli`) does, against the database that `Database:Provider` and
`ConnectionStrings:Popkin` name (from `appsettings.json`, environment variables such as
`Database__Provider`, or `--Key=value` arguments):

| Command | What it does |
|---|---|
| `dotnet run --project backend/src/Popkin.Cli -- migrate` | Applies the migrations (SQL Server) or builds the schema from the model (SQLite) |
| `dotnet run --project backend/src/Popkin.Cli -- seed` | Adds the starting data; safe to re-run |
| `dotnet run --project backend/src/Popkin.Cli -- reset` | Deletes the database, then migrates and seeds it |

A deployed API also needs `Auth:CodeHashKey` (the key codes are hashed with), `Invites:BaseUrl`
(the address invite links start with) and `App:Origin` (the web app's origin). Every setting, the
proxy and the release steps are in [`docs/deployment.md`](docs/deployment.md).

## Building and testing

| What | Command | Where |
|---|---|---|
| Build the frontend | `npm run build` | `frontend/` |
| Backend tests | `pwsh eng/Test-Backend.ps1` | repository root |
| Frontend unit tests (the `api` library) | `npm test` | `frontend/` |
| Frontend lint | `npm run lint` | `frontend/` |
| Frontend format check | `npm run format:check` | `frontend/` |
| End-to-end type check | `npm run typecheck` | `e2e/` |
| End-to-end behaviour tests | `npm test` | `e2e/` |
| Component parity with the mocks | `npm run parity` | `e2e/` |
| Refresh the recorded API answers | `npm run record-api` | `e2e/`, with `pwsh eng/Start-E2eApi.ps1` running |
| Check the token copy against the design system | `npm run design:check` | `frontend/` |
| Visual, responsive and accessibility sweeps | `npm run sweeps` | `e2e/` (repository owner, by hand only) |
| Save a video's screenshots (not a test, not a sweep) | `node tools/video-record/record.mjs docs/videos/<folder>` | repository root |
| Measure a music track's tempo | `.cache/video-venv/bin/python tools/video-audio/tempo.py docs/videos/assets/music/<slug>.mp3` | repository root |
| Speak and mix a video's soundtrack (MP3, `captions.vtt`, `timing.js`) | `.cache/video-venv/bin/python tools/video-audio/film_audio.py docs/videos/<folder>` | repository root |
| Print a video's schedule, or save one frame | `node tools/video-build/build.mjs docs/videos/<folder> --check` (or `--frame <seconds> <png>`) | repository root |
| Render a video (MP4; `--captions` burns captions in) | `node tools/video-build/build.mjs docs/videos/<folder>` | repository root |

- The backend tests run on EF Core InMemory and need no database. The hub's tests connect a
  SignalR client to the test server in memory
  ([ADR 0010](docs/adr/0010-the-hub-in-tests.md)).
- The end-to-end suite runs in Chromium only; run `npx playwright install chromium` in `e2e/`
  once. It starts the app by itself, or uses the one already running, and never reaches the API:
  every `/api` request is answered from the recorded responses in
  `e2e/fixtures/api/responses.json` ([ADR 0005](docs/adr/0005-tests-without-a-backend-or-database.md)),
  and the hub is stubbed by `e2e/fixtures/hub.ts`.
- `npm test` runs the behaviour specs only
  ([ADR 0006](docs/adr/0006-behaviour-tests-only-by-default.md)). The sweeps render the mocks in
  `docs/mocks` to screenshots, then compare the app with them region by region. CI never runs the
  sweeps, and the screenshots are not committed: to change how a screen looks, change its mock
  first.
- `npm run parity` runs the component parity specs in `e2e/tests/parity/` and nothing else
  ([ADR 0008](docs/adr/0008-component-parity-specs.md)): one spec per component of the
  `components` library, compared with the mocks at 360 px and 1280 px in both themes.

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs the backend tests, the token check, the frontend lint,
format check, unit tests and build, the behaviour specs and the component parity specs on every push to
`main` and every pull request.

## Repository structure

The full layout and its rules are in [`AGENTS.md`](AGENTS.md).

```
popkin/
├── backend/                .NET solution (Popkin.sln)
│   ├── src/                Popkin.Domain, .Application, .Infrastructure, .Api, .Worker, .Cli
│   └── tests/              one test project per source project
├── frontend/               Angular workspace
│   └── projects/           popkin (the app), api (service contracts), components (pk-* atoms)
├── e2e/                    Playwright suite: fixtures, page objects, specs
├── eng/                    local engineering scripts
├── tools/                  scripts that build the narrated videos
├── docs/
│   ├── specs/              requirements: L0.md (the mission), L1.md (high level), L2.md (acceptance criteria)
│   ├── mocks/              static HTML mocks of every screen in every state
│   ├── design-system/      tokens, foundations, components and patterns
│   ├── detailed-designs/   one design per feature, grouped by subsystem
│   ├── adr/                architecture decisions
│   ├── estimates/          effort and percent complete per design
│   ├── personas/           invented people who come across Popkin
│   ├── prompts/            one implementation prompt per journey
│   └── videos/             narrated videos, one folder each
├── .github/                CI workflow, issue and pull request templates
├── AGENTS.md               rules for people and coding agents working in this repository
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── SUPPORT.md
└── README.md
```

`docs/personas/` is empty for now; the other folders hold their documents.

## Documentation

| Document | What it covers |
|---|---|
| [Architecture decisions](docs/adr/README.md) | The decisions that shape the code, one record each |
| [AGENTS.md](AGENTS.md) | Repository layout, architecture rules and the required workflow |
| [Detailed designs](docs/detailed-designs/README.md) | The shared architecture, the real-time rules, the known gaps and one design per feature |
| [Deployment](docs/deployment.md) | The images, every setting, the proxy and a smoke test |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed, made and tested |

## Contributing

Contributions are welcome. Read [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow, and
[`AGENTS.md`](AGENTS.md) for the architecture rules, before you open a pull request. In short:

- Every change to production behaviour needs a requirement, a detailed design and a mock before
  any code is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code in agreement.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By taking part you agree
to uphold it.

## Security

Do not report a security vulnerability in a public issue. See [`SECURITY.md`](SECURITY.md) for how
to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown.

Licensed under the [MIT License](LICENSE).
