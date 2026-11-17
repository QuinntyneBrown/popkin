# Popkin Admin mocks

Static HTML mocks for every page, dialog and notification of the admin app, in every state,
derived from the "Popkin Admin" prototype of the Popkin Community Platform designs (the Magic
Patterns export). The admin app is a separate application (`frontend/projects/admin`), apart from
the Popkin app whose mocks are one folder up; it shares only the design system. These mocks are
the source of truth for its UI (ADR 0003): change a mock first, then the app.

<!--
Cast and catalog. Reuse these in every admin mock so the story holds together.

Today: Monday 14 July, 10:42, one production snapshot; figures refresh every minute.
Signed-in admin: Lena Fischer (Plum, initials LF), Owner, lena@popkin.app.
Other admins: Kwame Mensah (Owner), Aiko Tanaka (Support), Marco Bianchi (Support),
  Hannah Cole (Viewer, added Sat 12 Jul).
Roles: Owner does everything; Support helps people and Popkins and moderates content; Viewer
  reads everything and changes nothing.
Totals: 48,210 people (+312 today), 3,112 Popkins live (174 started today), 9,610 active today.
People: Mara Okafor, Walt Brennan, Dev Patel, Ellie Brennan, Sam Ortega, Joel Kim, Priya Nair,
  Nadia Haddad (active); Ruth Lindqvist and Tomás Reyes (suspended); Grace Adeyemi and
  Ben Achterberg (being deleted).
Popkins: Lakeside Weekend 🏕️ (Mara, PINE-4821), Class of 2015 Reunion 🎓 (Dev), Bakery Launch
  Crew 🥐 (Priya, ending), Sunday Brunch Club 🥞 (Sam), Hackathon Team Owl 🦉 (Joel, ending),
  Ellie & Walt's Wedding 💐 (Ellie, wrapped up), U10 Hornets Parents ⚽ (Walt), Algarve Girls
  Weekend 🏖️ (Nadia).
Waiting: 5 reports, the realtime hub degraded on eu-west-2 since 10:10, Prepare album exports
  failed at 10:40 with 2 exports stuck, Dev Patel's data request due in 4 days, Ruth Lindqvist
  erased in 2 days.
-->

## How to open them

Open [index.html](index.html) in a browser, straight from disk; nothing needs a server or a
network. Every mock has a bar at the bottom that lists its sibling states and switches the theme.

- `?theme=dark` or `?theme=light` forces a theme; `t` toggles it.
- `?chrome=0` hides the mock bar and the notes, leaving exactly what the product shows.
- From 1024 px a sidebar lists the sections in six groups (Overview, People, Popkins, Operations,
  Platform, Access) with the signed-in admin and Sign out at its foot. Below 1024 px a top bar
  carries the menu, which opens the same list as a drawer (`dialogs/menu`). The environment
  ("Production") is always on screen so that no admin mistakes it for staging.
- Lists read as tables from 768 px and as stacked records below it.
- Dialogs are shown over the page they open from, which stays visible but inert. Under 640 px they
  are bottom sheets.
- A `viewer` state shows a page as a Viewer sees it: a banner says so and every action is
  disabled, with the reason as its tooltip.

## Assets

- `../../design-system/tokens/tokens.css` and `../../design-system/assets/components.css`: the
  tokens and every component class. The admin's parts are the section "The admin app" of
  `components.css` (`admin-shell`, `admin-nav`, `page-head`, `panel`, `data-table`, `status`,
  `kv`, `figure-tab`, `tile`, `trend`, `uptime`, `attention`, `log`, `evidence` and the rest).
- `assets/tokens.css`: a one-line forwarder to the design system's tokens, for the gallery that
  `check_mocks.py` generates.
- `../assets/mock.css`, `../assets/mock.js`, `../assets/images/`: shared with the Popkin app's
  mocks; not product UI.

## Where the mocks differ from the designs

- The jobs are Popkin's four Worker jobs (Wrap up due Popkins, Remove photos of wrapped-up
  Popkins, Prepare album exports, Purge deleted accounts), not the design's seven invented ones;
  the failed job is Prepare album exports. Their schedules and run figures are invented.
- "Algarve Girls Trip" is "Algarve Girls Weekend", and the extend placeholder reads "Event
  postponed by a week": no copy names a concept "trip" (AGENTS.md).
- The design's seed data contradicted itself, so the People screens settle it with the dashboard
  and the audit log: Ruth Lindqvist is being deleted (erased in 2 days), Tomás Reyes was suspended
  today at 09:58 by Aiko, Inês Duarte takes Tomás's place in the deletion queue, and Ben
  Achterberg's deletion was started by Marco.
- An action's outcome is the design system's toast, not the design's dark strip under the header.
- Every moderating action (suspend, remove content, extend, reset an invite, change a limit)
  asks for a reason, which the audit log records, so its dialog has an invalid state; in the
  design the reason is optional or the change is immediate.
- Sign in uses the design system's single code field, not six digit boxes.
- Choosing Off, Chosen Popkins or Everyone on Features opens a dialog; adding a Popkin is a dialog,
  not a popover.
- Limits drops "Video clip": Popkin has no video uploads.
- Settings lists the real keys of `docs/deployment.md` and never shows a secret's value, only
  "Set" or "Not set".
- Charts draw in ink, or in danger for an error rate, never in the design's teal.
- Notifications (`notifications` and its four dialogs, added 17 November 2026) follows the
  Popkin Admin › Notifications design. The kinds table uses the design system's data table, so
  on a phone each row stacks. Support (Aiko Tanaka) takes the design's "Joe Park" as the admin
  who placed the holds, and the held Popkin is Class of 2015 Reunion. Each switch opens a
  confirmation with an optional reason, as Features does. "Hold a Popkin" stays a popover
  picker, as the design draws it, unlike Features' dialog (see Still open).
- Holiday calendars (`holidays`, `holidays-publish`, added 17 November 2026) and the Popkin's
  Important days panel with `popkin-remove-day` follow the Popkin Admin › Holiday Calendars and
  Popkin Detail designs. The design's years move on by one to fit this set's July 2026 (tabs
  2026–2028; Islamic holidays and Hindu festivals have dates only through 2026), Kwame Mensah
  takes the design's "Omar Siddiqui" as the admin who keeps the hand-confirmed calendars, and
  Lakeside Weekend's days fall inside its 1–28 Jul run. The calendar list uses the list-detail
  rows Reports uses, not a table. Publish and Remove day ask for a required reason, as every
  moderating action here does; Publish is never switched off for an Owner. A Viewer sees every
  button switched off, with the Viewer notice. "New calendar" has no design behind it, so it
  leads nowhere yet. The design's dark strip after publishing is the design system's toast.

## Decisions and what follows

The requirements now cover every admin screen: L1-019 and L1-021 to L1-028, and L2-076 to L2-078
and L2-086 to L2-120 in `docs/specs/`. The owner settled the largest questions on 15 November 2026:

- **What the admin app sees inside a Popkin** (L2-078 AC4). Who is in a Popkin and how it is doing,
  never what its members share. The exceptions are a reported item with up to five messages
  either side of it (L2-109), and a moderation view (L2-111): for a serious case an Owner or
  Support admin opens one Popkin's Everyone thread, album and experiences, read-only, for 30
  minutes, by giving a reason the audit log records. A direct message is seen only when one of
  its two members reports it. The Privacy notice says so (L2-082 AC8).
- **Admins.** Configuration names the first Owner; Owners add and remove admins and change roles
  in the app (L2-078 AC1, L2-119). What each role may do is the table of `admins/roles` (L2-086).
- **The Popkin app's side.** Members report a message, a photo or an experience (L2-108), and
  see the announcement banner (L2-116).
- **Features** have three settings, Off, Chosen Popkins and Everyone (L2-076, L2-077).

Smaller questions settled by the requirements:

- Sign in takes an email only; three wrong codes lock it for 15 minutes (L2-088).
- The reason is required for every change to a person, a Popkin, content, a call or a limit, and
  optional for a feature or an admin (L2-087), as these mocks draw it.
- Every admin, Viewer included, reads and exports the audit log, kept 2 years (L2-120).
- Limits keeps the limits the requirements already set, which an Owner can then change (L2-117).
- The Popkin detail's activity keeps its features, which Chosen Popkins makes real, and loses its
  region, which Popkin does not have.

### Mocks to change

Where a mock and a requirement now disagree, the requirement stands and the mock changes:

- **Limits** (`limits`, `limit-save`): Photo defaults to 10 MB (L2-031), Messages to 60 a minute
  (L2-053); the rate limits are the four of L2-117 AC1 (sign-in codes per email or phone and per
  address, invite codes tried per address), not joins per Popkin, photo uploads or API requests.
  The audit log's and the dashboard's sample entries follow.
- **Account deletion** (`person`, `person-delete`, `deletion-cancel`): an active Popkin the person
  hosts is wrapped up (L2-049 AC3), not passed to the longest-standing member, and a cancelled
  deletion does not reopen it.
- **Popkin** (`popkin`): drop Region from Activity.
- **Person** (`person`): drop Region from Account.
- **Reports** (`reports`): show the five messages either side of a reported message (L2-109 AC3).

### Mocks to add

- In the Popkin app's mocks (`docs/mocks/`, not this folder): the notice an author sees when their
  content is removed (L2-110 AC2) and the screen a suspended person sees at sign in (L2-095 AC3).

Drawn on 15 November 2026: the moderation view (`pages/moderation-view`, `dialogs/moderation-view-open`,
`dialogs/moderation-remove` and "Open moderation view" on `popkin`, L2-111); in the Popkin app's
mocks, the Report dialog and "Reported" in Message, Photo and Experience actions (L2-108) and the
announcement banner (`notifications/announcement`, L2-116).

### Still open

- "Hold a Popkin" is a popover on Notifications and a dialog on Features; one pattern should win.
  Notifications now has its requirements (L2-169 to L2-173) and designs; on 17 November 2026 its
  mocks took the requirement's twelve kinds and words, "Until released" and a required reason,
  and gained `notification-hold-add`, `notification-defaults-save` and the Defaults tab's
  edited, invalid, saved, loading and error states.
- The ADR the admin application needs (ADR 0002) and an ADR for moderation access; ADR 0023 holds
  a switch in configuration, and Chosen Popkins needs it held in the database.
- Detailed designs for every admin L2, and the journeys that build them (journey 23 covers
  Features only).
- Data requests arrive "In-app" in the design; the Popkin app has no way to ask for one yet.
- Erasing the audit log's two-year-old entries needs a Worker job, a fifth beside the four on
  Jobs.
- Health and Metrics need admin endpoints over the telemetry (ADR 0012) and the services' checks.
- Holiday calendars and the Popkin's Important days panel come only from the designs: they have
  no requirement or detailed design yet, so `holidays`, `holidays-publish` and
  `popkin-remove-day` list none. What "New calendar" asks for, and who is told when a day is
  removed from a Popkin (the design says its author), are open.

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | invalid-email | sending | code | invalid | checking | locked | metric-popkins | all-clear | suspended | no-results | forbidden | deleting | support | viewer | suspended-toast | restored | signed-out | deletion-started | export-started | cancelled | logged | ending | wrapped | extended | wrapped-now | member-removed | invite-reset | album | experiences | removed | closed | photo | photos | dismissed | ended | 7-days | all-good | down | collapsed | running | retried | off | everyone | warning | published | live | taken-down | paused | holds | hold-adding | defaults | defaults-edited | defaults-invalid | defaults-saved | defaults-loading | defaults-error | changing | rule | edited | saved | filtered | roles | invited | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | ➖ | [✅](pages/sign-in/invalid-email.html) | [✅](pages/sign-in/sending.html) | [✅](pages/sign-in/code.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/checking.html) | [✅](pages/sign-in/locked.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078`, `L2-088` |
| Not an admin (`not-an-admin`) | [✅](pages/not-an-admin/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-089` |
| Server error (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-089` |
| Dashboard (`dashboard`) | [✅](pages/dashboard/default.html) | [✅](pages/dashboard/loading.html) | ➖ | [✅](pages/dashboard/error.html) |  |  |  |  |  |  | [✅](pages/dashboard/metric-popkins.html) | [✅](pages/dashboard/all-clear.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-090` |
| People (`people`) | [✅](pages/people/default.html) | [✅](pages/people/loading.html) | ➖ | [✅](pages/people/error.html) |  |  |  |  |  |  |  |  | [✅](pages/people/suspended.html) | [✅](pages/people/no-results.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-093` |
| Person (`person`) | [✅](pages/person/default.html) | [✅](pages/person/loading.html) | ➖ | [✅](pages/person/error.html) |  |  |  |  |  |  |  |  | [✅](pages/person/suspended.html) |  |  | [✅](pages/person/deleting.html) | [✅](pages/person/support.html) | [✅](pages/person/viewer.html) | [✅](pages/person/suspended-toast.html) | [✅](pages/person/restored.html) | [✅](pages/person/signed-out.html) | [✅](pages/person/deletion-started.html) | [✅](pages/person/export-started.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-094`, `L2-095`, `L2-096`, `L2-097`, `L2-098`, `L2-100` |
| Deletion queue (`deletions`) | [✅](pages/deletions/default.html) | [✅](pages/deletions/loading.html) | [✅](pages/deletions/empty.html) | [✅](pages/deletions/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/deletions/viewer.html) |  |  |  |  |  | [✅](pages/deletions/cancelled.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-099` |
| Data requests (`data-requests`) | [✅](pages/data-requests/default.html) | [✅](pages/data-requests/loading.html) | [✅](pages/data-requests/empty.html) | [✅](pages/data-requests/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/data-requests/viewer.html) |  |  |  |  |  |  | [✅](pages/data-requests/logged.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-101` |
| Popkins (`popkins`) | [✅](pages/popkins/default.html) | [✅](pages/popkins/loading.html) | ➖ | [✅](pages/popkins/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/popkins/no-results.html) |  |  |  | ➖ |  |  |  |  |  |  |  | [✅](pages/popkins/ending.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-102` |
| Popkin (`popkin`) | [✅](pages/popkin/default.html) | [✅](pages/popkin/loading.html) | ➖ | [✅](pages/popkin/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin/viewer.html) |  |  |  |  |  |  |  | [✅](pages/popkin/ending.html) | [✅](pages/popkin/wrapped.html) | [✅](pages/popkin/extended.html) | [✅](pages/popkin/wrapped-now.html) | [✅](pages/popkin/member-removed.html) | [✅](pages/popkin/invite-reset.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078`, `L2-086`, `L2-103`, `L2-104`, `L2-105`, `L2-106`, `L2-107`, `L2-111` |
| Moderation view (`moderation-view`) | [✅](pages/moderation-view/default.html) | [✅](pages/moderation-view/loading.html) | ➖ | [✅](pages/moderation-view/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/moderation-view/album.html) | [✅](pages/moderation-view/experiences.html) | [✅](pages/moderation-view/removed.html) | [✅](pages/moderation-view/closed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-110`, `L2-111` |
| Reports (`reports`) | [✅](pages/reports/default.html) | [✅](pages/reports/loading.html) | [✅](pages/reports/empty.html) | [✅](pages/reports/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/reports/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/reports/removed.html) |  | [✅](pages/reports/photo.html) | [✅](pages/reports/photos.html) | [✅](pages/reports/dismissed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-109`, `L2-110` |
| Live calls (`calls`) | [✅](pages/calls/default.html) | [✅](pages/calls/loading.html) | [✅](pages/calls/empty.html) | [✅](pages/calls/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/calls/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/calls/ended.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-112` |
| Metrics (`metrics`) | [✅](pages/metrics/default.html) | [✅](pages/metrics/loading.html) | ➖ | [✅](pages/metrics/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/metrics/7-days.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-091` |
| Health (`health`) | [✅](pages/health/default.html) | [✅](pages/health/loading.html) | ➖ | [✅](pages/health/error.html) |  |  |  |  | [✅](pages/health/checking.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/health/all-good.html) | [✅](pages/health/down.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-092` |
| Jobs (`jobs`) | [✅](pages/jobs/default.html) | [✅](pages/jobs/loading.html) | ➖ | [✅](pages/jobs/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/jobs/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/jobs/collapsed.html) | [✅](pages/jobs/running.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-113` |
| Album exports (`exports`) | [✅](pages/exports/default.html) | [✅](pages/exports/loading.html) | [✅](pages/exports/empty.html) | [✅](pages/exports/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/exports/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/exports/retried.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-114` |
| Features (`features`) | [✅](pages/features/default.html) | [✅](pages/features/loading.html) | ➖ | [✅](pages/features/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/features/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/features/off.html) | [✅](pages/features/everyone.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-076`, `L2-077`, `L2-086` |
| Announcements (`announcements`) | [✅](pages/announcements/default.html) | [✅](pages/announcements/loading.html) | [✅](pages/announcements/empty.html) | [✅](pages/announcements/error.html) |  |  |  | [✅](pages/announcements/invalid.html) |  |  |  |  |  |  |  |  |  | [✅](pages/announcements/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/announcements/warning.html) | [✅](pages/announcements/published.html) | [✅](pages/announcements/live.html) | [✅](pages/announcements/taken-down.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-086`, `L2-115` |
| Notifications (`notifications`) | [✅](pages/notifications/default.html) | [✅](pages/notifications/loading.html) | ➖ | [✅](pages/notifications/error.html) |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notifications/support.html) | [✅](pages/notifications/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/notifications/paused.html) | [✅](pages/notifications/holds.html) | [✅](pages/notifications/hold-adding.html) | [✅](pages/notifications/defaults.html) | [✅](pages/notifications/defaults-edited.html) | [✅](pages/notifications/defaults-invalid.html) | [✅](pages/notifications/defaults-saved.html) | [✅](pages/notifications/defaults-loading.html) | [✅](pages/notifications/defaults-error.html) |  |  |  |  |  |  |  | `L2-169`, `L2-170`, `L2-171`, `L2-172`, `L2-173`, `L2-086` |
| Holiday calendars (`holidays`) | [✅](pages/holidays/default.html) | [✅](pages/holidays/loading.html) | ➖ | [✅](pages/holidays/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/holidays/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/holidays/published.html) |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/holidays/changing.html) | [✅](pages/holidays/rule.html) |  |  |  |  |  |  |
| Limits (`limits`) | [✅](pages/limits/default.html) | [✅](pages/limits/loading.html) | ➖ | [✅](pages/limits/error.html) |  |  |  | [✅](pages/limits/invalid.html) |  |  |  |  |  |  |  |  |  | [✅](pages/limits/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/limits/edited.html) | [✅](pages/limits/saved.html) |  |  |  | `L2-086`, `L2-117`, `L2-176` |
| Settings (`settings`) | [✅](pages/settings/default.html) | [✅](pages/settings/loading.html) | ➖ | [✅](pages/settings/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/settings/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/settings/filtered.html) |  |  | `L2-118` |
| Admins & roles (`admins`) | [✅](pages/admins/default.html) | [✅](pages/admins/loading.html) | ➖ | [✅](pages/admins/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/admins/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admins/removed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admins/roles.html) | [✅](pages/admins/invited.html) | `L2-086`, `L2-119` |
| Audit log (`audit`) | [✅](pages/audit/default.html) | [✅](pages/audit/loading.html) | ➖ | [✅](pages/audit/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/audit/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/audit/filtered.html) |  |  | `L2-120` |

### Dialogs

| Screen | default | busy | invalid | failed | results | no-results | turn-on | Requirements |
|---|---|---|---|---|---|---|---|---|
| Menu (`menu`) | [✅](dialogs/menu/default.html) | ➖ | ➖ |  |  |  |  | `L2-089` |
| Suspend a person (`person-suspend`) | [✅](dialogs/person-suspend/default.html) | [✅](dialogs/person-suspend/busy.html) | [✅](dialogs/person-suspend/invalid.html) | [✅](dialogs/person-suspend/failed.html) |  |  |  | `L2-087`, `L2-095` |
| Lift a suspension (`person-restore`) | [✅](dialogs/person-restore/default.html) | [✅](dialogs/person-restore/busy.html) | [✅](dialogs/person-restore/invalid.html) | [✅](dialogs/person-restore/failed.html) |  |  |  | `L2-087`, `L2-096` |
| Sign a person out (`person-sign-out`) | [✅](dialogs/person-sign-out/default.html) | [✅](dialogs/person-sign-out/busy.html) | [✅](dialogs/person-sign-out/invalid.html) | [✅](dialogs/person-sign-out/failed.html) |  |  |  | `L2-087`, `L2-097` |
| Start a deletion (`person-delete`) | [✅](dialogs/person-delete/default.html) | [✅](dialogs/person-delete/busy.html) | [✅](dialogs/person-delete/invalid.html) | [✅](dialogs/person-delete/failed.html) |  |  |  | `L2-087`, `L2-098` |
| Export a person’s data (`person-export`) | [✅](dialogs/person-export/default.html) | [✅](dialogs/person-export/busy.html) | [✅](dialogs/person-export/invalid.html) | [✅](dialogs/person-export/failed.html) |  |  |  | `L2-087`, `L2-100` |
| Cancel a deletion (`deletion-cancel`) | [✅](dialogs/deletion-cancel/default.html) | [✅](dialogs/deletion-cancel/busy.html) | [✅](dialogs/deletion-cancel/invalid.html) | [✅](dialogs/deletion-cancel/failed.html) |  |  |  | `L2-087`, `L2-099` |
| Log a data request (`data-request-new`) | [✅](dialogs/data-request-new/default.html) | [✅](dialogs/data-request-new/busy.html) | [✅](dialogs/data-request-new/invalid.html) | [✅](dialogs/data-request-new/failed.html) |  |  |  | `L2-087`, `L2-101` |
| Wrap up a Popkin now (`popkin-wrap-up`) | [✅](dialogs/popkin-wrap-up/default.html) | [✅](dialogs/popkin-wrap-up/busy.html) | [✅](dialogs/popkin-wrap-up/invalid.html) | [✅](dialogs/popkin-wrap-up/failed.html) |  |  |  | `L2-087`, `L2-104` |
| Give a Popkin more time (`popkin-extend`) | [✅](dialogs/popkin-extend/default.html) | [✅](dialogs/popkin-extend/busy.html) | [✅](dialogs/popkin-extend/invalid.html) | [✅](dialogs/popkin-extend/failed.html) |  |  |  | `L2-087`, `L2-105` |
| Remove a member (`popkin-remove-member`) | [✅](dialogs/popkin-remove-member/default.html) | [✅](dialogs/popkin-remove-member/busy.html) | [✅](dialogs/popkin-remove-member/invalid.html) | [✅](dialogs/popkin-remove-member/failed.html) |  |  |  | `L2-087`, `L2-106` |
| Reset the invite (`popkin-reset-invite`) | [✅](dialogs/popkin-reset-invite/default.html) | [✅](dialogs/popkin-reset-invite/busy.html) | [✅](dialogs/popkin-reset-invite/invalid.html) | [✅](dialogs/popkin-reset-invite/failed.html) |  |  |  | `L2-087`, `L2-107` |
| Remove a day (`popkin-remove-day`) | [✅](dialogs/popkin-remove-day/default.html) | [✅](dialogs/popkin-remove-day/busy.html) | [✅](dialogs/popkin-remove-day/invalid.html) | [✅](dialogs/popkin-remove-day/failed.html) |  |  |  |  |
| Open a moderation view (`moderation-view-open`) | [✅](dialogs/moderation-view-open/default.html) | [✅](dialogs/moderation-view-open/busy.html) | [✅](dialogs/moderation-view-open/invalid.html) | [✅](dialogs/moderation-view-open/failed.html) |  |  |  | `L2-087`, `L2-111` |
| Remove content in a moderation view (`moderation-remove`) | [✅](dialogs/moderation-remove/default.html) | [✅](dialogs/moderation-remove/busy.html) | [✅](dialogs/moderation-remove/invalid.html) | [✅](dialogs/moderation-remove/failed.html) |  |  |  | `L2-087`, `L2-110`, `L2-111` |
| Remove reported content (`report-remove`) | [✅](dialogs/report-remove/default.html) | [✅](dialogs/report-remove/busy.html) | [✅](dialogs/report-remove/invalid.html) | [✅](dialogs/report-remove/failed.html) |  |  |  | `L2-087`, `L2-110` |
| End a call (`call-end`) | [✅](dialogs/call-end/default.html) | [✅](dialogs/call-end/busy.html) | [✅](dialogs/call-end/invalid.html) | [✅](dialogs/call-end/failed.html) |  |  |  | `L2-087`, `L2-112` |
| Turn off a feature (`turn-off-feature`) | [✅](dialogs/turn-off-feature/default.html) | [✅](dialogs/turn-off-feature/busy.html) | ➖ | [✅](dialogs/turn-off-feature/failed.html) |  |  |  | `L2-076` |
| Turn a feature on for everyone (`feature-everyone`) | [✅](dialogs/feature-everyone/default.html) | [✅](dialogs/feature-everyone/busy.html) | ➖ | [✅](dialogs/feature-everyone/failed.html) |  |  |  | `L2-076` |
| Limit a feature to chosen Popkins (`feature-chosen`) | [✅](dialogs/feature-chosen/default.html) | [✅](dialogs/feature-chosen/busy.html) | ➖ | [✅](dialogs/feature-chosen/failed.html) |  |  |  | `L2-076` |
| Add a Popkin to a feature (`feature-add-popkin`) | [✅](dialogs/feature-add-popkin/default.html) | [✅](dialogs/feature-add-popkin/busy.html) | ➖ | [✅](dialogs/feature-add-popkin/failed.html) | [✅](dialogs/feature-add-popkin/results.html) | [✅](dialogs/feature-add-popkin/no-results.html) |  | `L2-076` |
| Publish a banner (`announcement-publish`) | [✅](dialogs/announcement-publish/default.html) | [✅](dialogs/announcement-publish/busy.html) | ➖ | [✅](dialogs/announcement-publish/failed.html) |  |  |  | `L2-115` |
| Take the banner down (`announcement-end`) | [✅](dialogs/announcement-end/default.html) | [✅](dialogs/announcement-end/busy.html) | ➖ | [✅](dialogs/announcement-end/failed.html) |  |  |  | `L2-115` |
| Pause all member email (`notifications-pause`) | [✅](dialogs/notifications-pause/default.html) | [✅](dialogs/notifications-pause/busy.html) | [✅](dialogs/notifications-pause/invalid.html) | [✅](dialogs/notifications-pause/failed.html) |  |  |  | `L2-087`, `L2-170` |
| Resume sending (`notifications-resume`) | [✅](dialogs/notifications-resume/default.html) | [✅](dialogs/notifications-resume/busy.html) | [✅](dialogs/notifications-resume/invalid.html) | [✅](dialogs/notifications-resume/failed.html) |  |  |  | `L2-087`, `L2-170` |
| Switch a kind for everyone (`notification-kind-switch`) | [✅](dialogs/notification-kind-switch/default.html) | [✅](dialogs/notification-kind-switch/busy.html) | [✅](dialogs/notification-kind-switch/invalid.html) | [✅](dialogs/notification-kind-switch/failed.html) |  |  | [✅](dialogs/notification-kind-switch/turn-on.html) | `L2-087`, `L2-171` |
| Release a hold (`notification-hold-release`) | [✅](dialogs/notification-hold-release/default.html) | [✅](dialogs/notification-hold-release/busy.html) | [✅](dialogs/notification-hold-release/invalid.html) | [✅](dialogs/notification-hold-release/failed.html) |  |  |  | `L2-087`, `L2-172` |
| Hold a Popkin (`notification-hold-add`) | [✅](dialogs/notification-hold-add/default.html) | [✅](dialogs/notification-hold-add/busy.html) | [✅](dialogs/notification-hold-add/invalid.html) | [✅](dialogs/notification-hold-add/failed.html) |  |  |  | `L2-087`, `L2-172` |
| Save new defaults (`notification-defaults-save`) | [✅](dialogs/notification-defaults-save/default.html) | [✅](dialogs/notification-defaults-save/busy.html) | [✅](dialogs/notification-defaults-save/invalid.html) | [✅](dialogs/notification-defaults-save/failed.html) |  |  |  | `L2-087`, `L2-173` |
| Publish a holiday calendar (`holidays-publish`) | [✅](dialogs/holidays-publish/default.html) | [✅](dialogs/holidays-publish/busy.html) | [✅](dialogs/holidays-publish/invalid.html) | [✅](dialogs/holidays-publish/failed.html) |  |  |  |  |
| Save new limits (`limit-save`) | [✅](dialogs/limit-save/default.html) | [✅](dialogs/limit-save/busy.html) | [✅](dialogs/limit-save/invalid.html) | [✅](dialogs/limit-save/failed.html) |  |  |  | `L2-087`, `L2-117`, `L2-176` |
| Add an admin (`admin-add`) | [✅](dialogs/admin-add/default.html) | [✅](dialogs/admin-add/busy.html) | [✅](dialogs/admin-add/invalid.html) | [✅](dialogs/admin-add/failed.html) |  |  |  | `L2-119` |
| Change an admin’s role (`admin-change-role`) | [✅](dialogs/admin-change-role/default.html) | [✅](dialogs/admin-change-role/busy.html) | ➖ | [✅](dialogs/admin-change-role/failed.html) |  |  |  | `L2-087`, `L2-119` |
| Remove an admin (`admin-remove`) | [✅](dialogs/admin-remove/default.html) | [✅](dialogs/admin-remove/busy.html) | ➖ | [✅](dialogs/admin-remove/failed.html) |  |  |  | `L2-087`, `L2-119` |

<!-- coverage:end -->

## Re-check and re-screenshot

```sh
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks/admin --write
python3 .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks/admin
```
