# Component backlog

The components in `docs/design-system/components/` that `frontend/projects/components` does not
build yet, ordered by value. Effort covers the component and its parity spec (ADR 0008).

The admin components come first because their screens have detailed designs and are on the
roadmap. The Contacts components come after them; Contacts now has its requirements (L2-121 to L2-151) and
detailed designs (`docs/detailed-designs/contacts/`), which name each component they compose. Tooltip is not listed: its page says
Popkin uses no custom tooltips.

| # | Component | Description | Effort | Status |
|---|---|---|---|---|
| 1 | Status pill | Record state beside a name or in a table column, on People, Jobs and Exports. | 0.5 days | Built, parity pending |
| 2 | Key values | Facts of one record on an admin detail page, as a description list. | 0.5 days | Not built: built with its screen (ADR 0029) |
| 3 | Report review | Reports queue and the evidence for one report, so a moderator can decide it. | 1.5 days | Not built: built with its screen (ADR 0029) |
| 4 | Activity lists | Five to ten recent items in a panel on Dashboard, Person and Announcements. | 1 day | Not built: built with its screen (ADR 0029) |
| 5 | Figures and tiles | Headline numbers on Dashboard and Metrics, as tabs or links to the detail. | 1 day | Not built: built with its screen (ADR 0029) |
| 6 | Limit row and save bar | Number input per limit, with a save bar that holds unsaved edits. | 1 day | Not built: built with its screen (ADR 0029) |
| 7 | Announcement preview | Shows how an announcement will look in the app, beside its form. | 1 day | Not built: built with its screen (ADR 0029) |
| 8 | Settings list | Read-only list of configuration values and the release, filterable, on Settings. | 0.5 days | Not built: built with its screen (ADR 0029) |
| 9 | Job row | Background job table row that expands to show its runs and details. | 1 day | Not built: built with its screen (ADR 0029) |
| 10 | Service health | Summary and per-service state on Health: all good, degraded or down. | 1 day | Not built: built with its screen (ADR 0029) |
| 11 | Trend chart and uptime | Accessible SVG trend for one series and an uptime bar, on Dashboard, Health and Metrics. | 1.5 days | Not built: built with its screen (ADR 0029) |
| 12 | Contact row | A person in the People list, linking to their profile. | 0.5 days | Built, with parity (row, quiet row, Closest) and a loading state |
| 13 | Contact header and facts | Head of a person's profile with their details as a description list. | 1 day || Built; header parity done (phone, email only) |
| 14 | Info card and add card | Sand card of facts, such as a habit, and a card that adds one. | 0.5 days | Built, with parity (habit) |
| 15 | Contact timeline | A person's history on their profile, newest first, as an ordered list. | 1 day | Built, with parity (conversation, milestone, memory) |
| 16 | Form sections | Splits the long Add someone form into sections with kind toggle buttons. | 1 day | Built, parity pending |
| 17 | Task | A follow-up to do, with the field that adds one; `pk-task-list` lists a bucket of them. | 1 day | Built, with parity (late, plain, done; the list; the add field) |
| 18 | Keep strip and habit row | A habit's rhythm with someone, showing which times were kept; `pk-habit-list` lists them. | 1 day | Built, with parity (first and last row) |
| 19 | Spotlight and date tile | The one most important thing on a screen, tinted, with a date tile. | 0.5 days || Built; spotlight parity done (row), date tile pending |
| 20 | Group browser | Navigation list of households, small groups and teams, with each group's detail. | 1 day | Built, with parity (list) |
| 21 | Connection map | Draws who knows whom: your people as faces linked by relationship; `pk-connection-panel` beside it. | 2 days || Built, with parity (none, focus, family; the panel's hint and chosen) |
| 22 | Contacts page and grid | The layout every Contacts section uses inside the Popkin shell; `narrow` is one column at the narrow container (Follow-ups, Habits). | 0.5 days | Built; list head with parity |
| 23 | Filter chips | Pressed-button filters with counts, such as the circles on People; `pk-choice-chips` is a radio group. | 0.25 days | Built, with parity |
| 24 | List row | The design system's `list-row` on Today: `pk-today-dates` (Coming up) and `pk-recent-list` (Recently). | 0.5 days | Built, with parity (coming up; recently at 1280) |
| 25 | Who chip as a link | A link form of `pk-who-chips`, for "It's been a while" on Today: `pk-drift-chips`. | 0.25 days | Built, with parity |
| 26 | Tick list | A list of people to tick, grouped, with "Show {n} more", for Import from your Popkins. | 0.5 days | Built, with parity: ungrouped for Add people (ticked), and grouped with "Show {n} more" as `pk-tick-group` for Import (ticked, nobody) |
| 27 | Back link | The page head's `page-head__back` on its own, beside a profile's actions ("People"). | 0.25 days | Built, with parity |
| 28 | Date list | Dates' rows: the date tile, the faces, the title, its line and "in {n} days". | 0.5 days | Built, with parity |
| 29 | Key dates | A profile's dates with their reminders. | 0.25 days | Built, with parity |
| 30 | Reminder defaults | Dates' aside: the default lead per kind, and phone and Monday email. | 0.5 days | Built, with parity |
| 31 | Log form, section and when | Log's one column, its parts named like fields, and when a conversation is logged. | 0.5 days | Built, with parity (form, promises, divided) |
| 32 | Memory list, chooser and upload | Memories' files and notes, Add's "Choose a photo", and the chosen photo or file with its progress. | 0.5 days | Built, with parity (list, chooser ×4, chosen) |
| 33 | People around and person choice | A contact's people as short linked rows, keyed on Connections; Connect's "Who" as a radio list. | 0.5 days | Built, with parity (panel; chosen, invalid) |
| 34 | Group members, Coming up, group chips and toggle chips | A group's members and its next dates; a profile's groups as links; the form's Groups as toggles. | 0.5 days | Built; members and Coming up with parity (thursday, sheffield; two, three) |
| 35 | It's been a while | Today's drifting people set apart under Recently by a hairline: the line and its who chips (`pk-drift`). | 0.25 days | Built, with parity |
| 36 | Who chip | The design system's `who-chip` on its own (`pk-who-chip`, a button or a link), composed by `pk-who-chips` and `pk-drift-chips` ([ADR 0029](adr/0029-one-library-no-unused-components.md)). | 0.25 days | To build (ADR 0029) |
| 37 | Stack and cluster | The layout utilities' spacing as knobs (`pk-stack` `gap`, `pk-cluster` `justify`), so an application template writes no modifier class ([ADR 0029](adr/0029-one-library-no-unused-components.md)). | 0.25 days | To build (ADR 0029) |
| 38 | Term list | What goes and what stays in Delete your account: each item a bold term and its sentence (`pk-term-list`). | 0.25 days | To build (ADR 0029) |

Total: 38 rows. Rows 1 to 22 come to about 20.5 days (admin 10.5, Contacts 10); rows 23 to
26 came from the Contacts designs and are not estimated yet.

Rows 2 to 11 were built on 15 November 2026, in the library only, before their screens
([ADR 0025](adr/0025-library-components-ahead-of-their-screens.md)), and removed on 17 November
2026 unused ([ADR 0029](adr/0029-one-library-no-unused-components.md)): a component exists only
while a screen uses it. Each is "Not built: built with its screen": the screen's change builds it
from its design-system page, with its parity spec. The Contacts ones built ahead of the Contacts
requirements are all used by Contacts screens now.