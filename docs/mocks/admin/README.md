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
- Every moderating action (suspend, remove content, extend, reset an invite, change a limit,
  change a role) asks for a reason, which the audit log records, so its dialog has an invalid
  state; in the design the reason is optional or the change is immediate.
- Sign in uses the design system's single code field, not six digit boxes.
- Choosing Off, Chosen Popkins or Everyone on Features opens a dialog; adding a Popkin is a dialog,
  not a popover.
- Limits drops "Video clip": Popkin has no video uploads.
- Settings lists the real keys of `docs/deployment.md` and never shows a secret's value, only
  "Set" or "Not set".
- Charts draw in ink, or in danger for an error rate, never in the design's teal.

## Open questions

These mocks draw the admin app as designed. Before any of it is built, the requirements need to
catch up, and some of the design contradicts them as they stand:

- **L2-078 AC4** says the admin app shows no Popkin's name, members, messages, photos or
  experiences, and its endpoints serve the feature switches only. People, Person, Popkins, Popkin,
  Reports (which quotes reported messages and photos), Live calls and Album exports all show what
  that criterion forbids. Either the requirement changes, with the privacy reasoning written down,
  or those screens shrink to counts. This is the largest question: it decides whether the admin
  app can see inside a Popkin at all.
- **L2-078 AC1** reads the admins from configuration; Admins & roles manages them, with roles, in
  the app.
- Only Features, sign in and Not an admin trace to requirements (L2-076 to L2-078). Every other
  screen needs an L1 and L2 requirement, a detailed design and an ADR for the new application
  (ADR 0002) before implementation, as AGENTS.md requires.
- Reporting content is not a feature of the Popkin app yet: Reports needs a way for members to
  report, which no journey has.
- Announcements need a place in the Popkin app to show; none is designed.
- **Features** has three modes (Off, Chosen Popkins, Everyone); L2-076 has one switch per
  feature for every Popkin, turned on without a dialog.
- Sign in takes a staff email only; L2-078 AC1 allows a phone number or an email. The
  `@popkin.app` rule and the lockout have no requirement.
- Nothing specifies the Owner, Support and Viewer roles, what each may do (may Support cancel a
  deletion?), the audit log's two years of retention or its CSV export.
- No Worker job builds a person's data export, and no admin endpoint serves health or metrics.
- The Popkin detail's Activity panel shows per-Popkin features and a region; Popkin has neither.
- Limits keeps the design's 5 sign-in codes an hour; the abuse-limits design sets 10 per 10
  minutes. Which limits are configurable at all is open.

<!-- coverage:start -->

Legend: ✅ mock exists · ➖ not applicable (reason in manifest) · ❌ missing

### Pages

| Screen | default | loading | empty | error | invalid-email | sending | code | invalid | checking | locked | metric-popkins | all-clear | suspended | no-results | forbidden | deleting | support | viewer | suspended-toast | restored | signed-out | deletion-started | export-started | cancelled | logged | ending | wrapped | extended | wrapped-now | member-removed | invite-reset | photo | photos | removed | dismissed | ended | 7-days | all-good | down | collapsed | running | retried | off | everyone | warning | published | live | taken-down | edited | saved | filtered | roles | invited | Requirements |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Admin sign in (`sign-in`) | [✅](pages/sign-in/default.html) | ➖ | ➖ | ➖ | [✅](pages/sign-in/invalid-email.html) | [✅](pages/sign-in/sending.html) | [✅](pages/sign-in/code.html) | [✅](pages/sign-in/invalid.html) | [✅](pages/sign-in/checking.html) | [✅](pages/sign-in/locked.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078` |
| Not an admin (`not-an-admin`) | [✅](pages/not-an-admin/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | `L2-078` |
| Not found (`not-found`) | [✅](pages/not-found/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Server error (`server-error`) | [✅](pages/server-error/default.html) | ➖ | ➖ | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Dashboard (`dashboard`) | [✅](pages/dashboard/default.html) | [✅](pages/dashboard/loading.html) | ➖ | [✅](pages/dashboard/error.html) |  |  |  |  |  |  | [✅](pages/dashboard/metric-popkins.html) | [✅](pages/dashboard/all-clear.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| People (`people`) | [✅](pages/people/default.html) | [✅](pages/people/loading.html) | ➖ | [✅](pages/people/error.html) |  |  |  |  |  |  |  |  | [✅](pages/people/suspended.html) | [✅](pages/people/no-results.html) | ➖ |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Person (`person`) | [✅](pages/person/default.html) | [✅](pages/person/loading.html) | ➖ | [✅](pages/person/error.html) |  |  |  |  |  |  |  |  | [✅](pages/person/suspended.html) |  |  | [✅](pages/person/deleting.html) | [✅](pages/person/support.html) | [✅](pages/person/viewer.html) | [✅](pages/person/suspended-toast.html) | [✅](pages/person/restored.html) | [✅](pages/person/signed-out.html) | [✅](pages/person/deletion-started.html) | [✅](pages/person/export-started.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Deletion queue (`deletions`) | [✅](pages/deletions/default.html) | [✅](pages/deletions/loading.html) | [✅](pages/deletions/empty.html) | [✅](pages/deletions/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/deletions/viewer.html) |  |  |  |  |  | [✅](pages/deletions/cancelled.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Data requests (`data-requests`) | [✅](pages/data-requests/default.html) | [✅](pages/data-requests/loading.html) | [✅](pages/data-requests/empty.html) | [✅](pages/data-requests/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/data-requests/viewer.html) |  |  |  |  |  |  | [✅](pages/data-requests/logged.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Popkins (`popkins`) | [✅](pages/popkins/default.html) | [✅](pages/popkins/loading.html) | ➖ | [✅](pages/popkins/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/popkins/no-results.html) |  |  |  | ➖ |  |  |  |  |  |  |  | [✅](pages/popkins/ending.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Popkin (`popkin`) | [✅](pages/popkin/default.html) | [✅](pages/popkin/loading.html) | ➖ | [✅](pages/popkin/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/popkin/viewer.html) |  |  |  |  |  |  |  | [✅](pages/popkin/ending.html) | [✅](pages/popkin/wrapped.html) | [✅](pages/popkin/extended.html) | [✅](pages/popkin/wrapped-now.html) | [✅](pages/popkin/member-removed.html) | [✅](pages/popkin/invite-reset.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Reports (`reports`) | [✅](pages/reports/default.html) | [✅](pages/reports/loading.html) | [✅](pages/reports/empty.html) | [✅](pages/reports/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/reports/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/reports/photo.html) | [✅](pages/reports/photos.html) | [✅](pages/reports/removed.html) | [✅](pages/reports/dismissed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Live calls (`calls`) | [✅](pages/calls/default.html) | [✅](pages/calls/loading.html) | [✅](pages/calls/empty.html) | [✅](pages/calls/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/calls/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/calls/ended.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Metrics (`metrics`) | [✅](pages/metrics/default.html) | [✅](pages/metrics/loading.html) | ➖ | [✅](pages/metrics/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/metrics/7-days.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Health (`health`) | [✅](pages/health/default.html) | [✅](pages/health/loading.html) | ➖ | [✅](pages/health/error.html) |  |  |  |  | [✅](pages/health/checking.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/health/all-good.html) | [✅](pages/health/down.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Jobs (`jobs`) | [✅](pages/jobs/default.html) | [✅](pages/jobs/loading.html) | ➖ | [✅](pages/jobs/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/jobs/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/jobs/collapsed.html) | [✅](pages/jobs/running.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |
| Album exports (`exports`) | [✅](pages/exports/default.html) | [✅](pages/exports/loading.html) | [✅](pages/exports/empty.html) | [✅](pages/exports/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/exports/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/exports/retried.html) |  |  |  |  |  |  |  |  |  |  |  |  |
| Features (`features`) | [✅](pages/features/default.html) | [✅](pages/features/loading.html) | ➖ | [✅](pages/features/error.html) |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/features/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/features/off.html) | [✅](pages/features/everyone.html) |  |  |  |  |  |  |  |  |  | `L2-076`, `L2-077`, `L2-078` |
| Announcements (`announcements`) | [✅](pages/announcements/default.html) | [✅](pages/announcements/loading.html) | [✅](pages/announcements/empty.html) | [✅](pages/announcements/error.html) |  |  |  | [✅](pages/announcements/invalid.html) |  |  |  |  |  |  |  |  |  | [✅](pages/announcements/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/announcements/warning.html) | [✅](pages/announcements/published.html) | [✅](pages/announcements/live.html) | [✅](pages/announcements/taken-down.html) |  |  |  |  |  |  |
| Limits (`limits`) | [✅](pages/limits/default.html) | [✅](pages/limits/loading.html) | ➖ | [✅](pages/limits/error.html) |  |  |  | [✅](pages/limits/invalid.html) |  |  |  |  |  |  |  |  |  | [✅](pages/limits/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/limits/edited.html) | [✅](pages/limits/saved.html) |  |  |  |  |
| Settings (`settings`) | [✅](pages/settings/default.html) | [✅](pages/settings/loading.html) | ➖ | [✅](pages/settings/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/settings/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/settings/filtered.html) |  |  |  |
| Admins & roles (`admins`) | [✅](pages/admins/default.html) | [✅](pages/admins/loading.html) | ➖ | [✅](pages/admins/error.html) |  |  |  |  |  |  |  |  |  | ➖ |  |  |  | [✅](pages/admins/viewer.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admins/removed.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/admins/roles.html) | [✅](pages/admins/invited.html) |  |
| Audit log (`audit`) | [✅](pages/audit/default.html) | [✅](pages/audit/loading.html) | ➖ | [✅](pages/audit/error.html) |  |  |  |  |  |  |  |  |  | [✅](pages/audit/no-results.html) |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  |  | [✅](pages/audit/filtered.html) |  |  |  |

### Dialogs

| Screen | default | busy | invalid | failed | results | no-results | Requirements |
|---|---|---|---|---|---|---|---|
| Menu (`menu`) | [✅](dialogs/menu/default.html) | ➖ | ➖ |  |  |  |  |
| Suspend a person (`person-suspend`) | [✅](dialogs/person-suspend/default.html) | [✅](dialogs/person-suspend/busy.html) | [✅](dialogs/person-suspend/invalid.html) | [✅](dialogs/person-suspend/failed.html) |  |  |  |
| Lift a suspension (`person-restore`) | [✅](dialogs/person-restore/default.html) | [✅](dialogs/person-restore/busy.html) | [✅](dialogs/person-restore/invalid.html) | [✅](dialogs/person-restore/failed.html) |  |  |  |
| Sign a person out (`person-sign-out`) | [✅](dialogs/person-sign-out/default.html) | [✅](dialogs/person-sign-out/busy.html) | [✅](dialogs/person-sign-out/invalid.html) | [✅](dialogs/person-sign-out/failed.html) |  |  |  |
| Start a deletion (`person-delete`) | [✅](dialogs/person-delete/default.html) | [✅](dialogs/person-delete/busy.html) | [✅](dialogs/person-delete/invalid.html) | [✅](dialogs/person-delete/failed.html) |  |  |  |
| Export a person’s data (`person-export`) | [✅](dialogs/person-export/default.html) | [✅](dialogs/person-export/busy.html) | [✅](dialogs/person-export/invalid.html) | [✅](dialogs/person-export/failed.html) |  |  |  |
| Cancel a deletion (`deletion-cancel`) | [✅](dialogs/deletion-cancel/default.html) | [✅](dialogs/deletion-cancel/busy.html) | [✅](dialogs/deletion-cancel/invalid.html) | [✅](dialogs/deletion-cancel/failed.html) |  |  |  |
| Log a data request (`data-request-new`) | [✅](dialogs/data-request-new/default.html) | [✅](dialogs/data-request-new/busy.html) | [✅](dialogs/data-request-new/invalid.html) | [✅](dialogs/data-request-new/failed.html) |  |  |  |
| Wrap up a Popkin now (`popkin-wrap-up`) | [✅](dialogs/popkin-wrap-up/default.html) | [✅](dialogs/popkin-wrap-up/busy.html) | [✅](dialogs/popkin-wrap-up/invalid.html) | [✅](dialogs/popkin-wrap-up/failed.html) |  |  |  |
| Give a Popkin more time (`popkin-extend`) | [✅](dialogs/popkin-extend/default.html) | [✅](dialogs/popkin-extend/busy.html) | [✅](dialogs/popkin-extend/invalid.html) | [✅](dialogs/popkin-extend/failed.html) |  |  |  |
| Remove a member (`popkin-remove-member`) | [✅](dialogs/popkin-remove-member/default.html) | [✅](dialogs/popkin-remove-member/busy.html) | [✅](dialogs/popkin-remove-member/invalid.html) | [✅](dialogs/popkin-remove-member/failed.html) |  |  |  |
| Reset the invite (`popkin-reset-invite`) | [✅](dialogs/popkin-reset-invite/default.html) | [✅](dialogs/popkin-reset-invite/busy.html) | [✅](dialogs/popkin-reset-invite/invalid.html) | [✅](dialogs/popkin-reset-invite/failed.html) |  |  |  |
| Remove reported content (`report-remove`) | [✅](dialogs/report-remove/default.html) | [✅](dialogs/report-remove/busy.html) | [✅](dialogs/report-remove/invalid.html) | [✅](dialogs/report-remove/failed.html) |  |  |  |
| End a call (`call-end`) | [✅](dialogs/call-end/default.html) | [✅](dialogs/call-end/busy.html) | [✅](dialogs/call-end/invalid.html) | [✅](dialogs/call-end/failed.html) |  |  |  |
| Turn off a feature (`turn-off-feature`) | [✅](dialogs/turn-off-feature/default.html) | [✅](dialogs/turn-off-feature/busy.html) | ➖ | [✅](dialogs/turn-off-feature/failed.html) |  |  | `L2-076` |
| Turn a feature on for everyone (`feature-everyone`) | [✅](dialogs/feature-everyone/default.html) | [✅](dialogs/feature-everyone/busy.html) | ➖ | [✅](dialogs/feature-everyone/failed.html) |  |  | `L2-076` |
| Limit a feature to chosen Popkins (`feature-chosen`) | [✅](dialogs/feature-chosen/default.html) | [✅](dialogs/feature-chosen/busy.html) | ➖ | [✅](dialogs/feature-chosen/failed.html) |  |  | `L2-076` |
| Add a Popkin to a feature (`feature-add-popkin`) | [✅](dialogs/feature-add-popkin/default.html) | [✅](dialogs/feature-add-popkin/busy.html) | ➖ | [✅](dialogs/feature-add-popkin/failed.html) | [✅](dialogs/feature-add-popkin/results.html) | [✅](dialogs/feature-add-popkin/no-results.html) | `L2-076` |
| Publish a banner (`announcement-publish`) | [✅](dialogs/announcement-publish/default.html) | [✅](dialogs/announcement-publish/busy.html) | ➖ | [✅](dialogs/announcement-publish/failed.html) |  |  |  |
| Take the banner down (`announcement-end`) | [✅](dialogs/announcement-end/default.html) | [✅](dialogs/announcement-end/busy.html) | ➖ | [✅](dialogs/announcement-end/failed.html) |  |  |  |
| Save new limits (`limit-save`) | [✅](dialogs/limit-save/default.html) | [✅](dialogs/limit-save/busy.html) | [✅](dialogs/limit-save/invalid.html) | [✅](dialogs/limit-save/failed.html) |  |  |  |
| Add an admin (`admin-add`) | [✅](dialogs/admin-add/default.html) | [✅](dialogs/admin-add/busy.html) | [✅](dialogs/admin-add/invalid.html) | [✅](dialogs/admin-add/failed.html) |  |  |  |
| Change an admin’s role (`admin-change-role`) | [✅](dialogs/admin-change-role/default.html) | [✅](dialogs/admin-change-role/busy.html) | ➖ | [✅](dialogs/admin-change-role/failed.html) |  |  |  |
| Remove an admin (`admin-remove`) | [✅](dialogs/admin-remove/default.html) | [✅](dialogs/admin-remove/busy.html) | ➖ | [✅](dialogs/admin-remove/failed.html) |  |  |  |

<!-- coverage:end -->

## Re-check and re-screenshot

```sh
python3 .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks/admin --write
python3 .claude/skills/writing-html-mocks/scripts/screenshot_mocks.py docs/mocks/admin
```
