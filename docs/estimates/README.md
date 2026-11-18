# Estimates

- Overall effort: 403 days
- Complete: 88%

| Subsystem | Effort | Complete |
|---|---|---|
| [accounts](accounts.md) | 25 days | 97% |
| [popkins](popkins.md) | 31 days | 69% |
| [invitations](invitations.md) | 13 days | 88% |
| [chat](chat.md) | 31 days | 90% |
| [security](security.md) | 13 days | 63% |
| [reliability](reliability.md) | 8 days | 45% |
| [accessibility](accessibility.md) | 11 days | 42% |
| [photos](photos.md) | 20 days | 92% |
| [calls](calls.md) | 13 days | 95% |
| [experiences](experiences.md) | 17 days | 95% |
| [wrap-up](wrap-up.md) | 14 days | 92% |
| [landing](landing.md) | 7 days | 100% |
| [schedules](schedules.md) | 20 days | 100% |
| [admin-access](admin-access.md) | 16 days | 97% |
| [plan](plan.md) | 17 days | 100% |
| [admin-platform](admin-platform.md) | 35 days | 68% |
| [contacts](contacts.md) | 73 days | 100% |
| [notifications](notifications.md) | 39 days | 99% |

## Roadmap

1. Photos: the photo store of a deployed system, which the album's zip and chat photos need too, and a zip of the originals.
2. A Popkin's own address: choose it when starting, open a Popkin by it, keep it when the Popkin is renamed, and find an invite by a link on it.
3. The SMS and email providers, which the crew invites need too.
4. Reliability: a saved answer for every screen and an app that opens without a connection.
5. Contacts, built in full and switched on (`Features:Contacts`) when its last pull request merges; it went in this order: add (with privacy's guard), profile (with privacy's not-found screen), people, the rest of open, delete, dates, follow-ups, log, memories, habits, connections, groups, import, Today and reminders. A log entry keeps its promises as follow-ups and its yearly milestone as a key date, so log comes after follow-ups and dates.
6. Notifications: the app side is built (settings, the delivery pipeline, the Popkin update email, levels, mutes, unsubscribe, birthday, story and wrap-up reminders, digests and the 90-day purge). Notification email goes out from the first deployment of this branch: `postalAddress` is set in `infra/main.bicep`. The admin controls are built too: pause and resume, kinds off for everyone, holds and the defaults, with the default birthday reminder for new members (L2-173).
