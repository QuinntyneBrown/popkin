# Component backlog

The components in `docs/design-system/components/` that `frontend/projects/components` does not
build yet, ordered by value. Effort covers the component and its parity spec (ADR 0008).

The admin components come first because their screens have detailed designs and are on the
roadmap. The Contacts components come after them because Contacts has no L1/L2 requirement or
detailed design yet, so it cannot be built until it has one. Tooltip is not listed: its page says
Popkin uses no custom tooltips.

| # | Component | Description | Effort |
|---|---|---|---|
| 1 | Status pill | Record state beside a name or in a table column, on People, Jobs and Exports. | 0.5 days |
| 2 | Key values | Facts of one record on an admin detail page, as a description list. | 0.5 days |
| 3 | Report review | Reports queue and the evidence for one report, so a moderator can decide it. | 1.5 days |
| 4 | Activity lists | Five to ten recent items in a panel on Dashboard, Person and Announcements. | 1 day |
| 5 | Figures and tiles | Headline numbers on Dashboard and Metrics, as tabs or links to the detail. | 1 day |
| 6 | Limit row and save bar | Number input per limit, with a save bar that holds unsaved edits. | 1 day |
| 7 | Announcement preview | Shows how an announcement will look in the app, beside its form. | 1 day |
| 8 | Settings list | Read-only list of configuration values and the release, filterable, on Settings. | 0.5 days |
| 9 | Job row | Background job table row that expands to show its runs and details. | 1 day |
| 10 | Service health | Summary and per-service state on Health: all good, degraded or down. | 1 day |
| 11 | Trend chart and uptime | Accessible SVG trend for one series and an uptime bar, on Dashboard, Health and Metrics. | 1.5 days |
| 12 | Contact row | A person in the People list, linking to their profile. | 0.5 days |
| 13 | Contact header and facts | Head of a person's profile with their details as a description list. | 1 day |
| 14 | Info card and add card | Sand card of facts, such as a habit, and a card that adds one. | 0.5 days |
| 15 | Contact timeline | A person's history on their profile, newest first, as an ordered list. | 1 day |
| 16 | Form sections | Splits the long Add someone form into sections with kind toggle buttons. | 1 day |
| 17 | Task | A follow-up to do, with the field that adds one. | 1 day |
| 18 | Keep strip and habit row | A habit's rhythm with someone, showing which times were kept. | 1 day |
| 19 | Spotlight and date tile | The one most important thing on a screen, tinted, with a date tile. | 0.5 days |
| 20 | Group browser | Navigation list of households, small groups and teams, with each group's detail. | 1 day |
| 21 | Connection map | Draws who knows whom: your people as faces linked by relationship. | 2 days |
| 22 | Contacts page and grid | The layout every Contacts section uses inside the Popkin shell. | 0.5 days |

Total: 22 components, about 20.5 days (admin 10.5, Contacts 10).
