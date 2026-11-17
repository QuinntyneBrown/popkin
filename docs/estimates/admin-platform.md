# Estimates: admin-platform

| Design | Effort | Complete |
|---|---|---|
| feature-switches | 5 days | 95% |
| announcements | 3 days | 0% |
| see-announcement | 2 days | 0% |
| limits | 4 days | 0% |
| settings | 2 days | 0% |
| notifications | 5 days | 95% |
| notification-holds | 4 days | 90% |
| notification-defaults | 3 days | 95% |

Feature switches are built end to end (journey 23): the switches in the database behind a
30-second snapshot, the Features page with its dialogs, and the Popkin app reading a Popkin's
switches every minute. Its optional reason uses `pk-textarea` until `pk-reason-field` is built. Announcements, limits and settings are journey 28.

Notifications are built end to end: whether member email is going out, pause and resume, a kind
off for everyone, holds on a Popkin and on deleting accounts, and the defaults members follow
until they choose, with the admin app on the API (ADR 0030 ended). What is left: opens and bounces
wait for gap 129, a manual hold on a person for gap 125, an automatic hold for a suspended account
for suspension, and paging the automatic holds.
