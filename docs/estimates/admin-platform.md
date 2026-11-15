# Estimates: admin-platform

| Design | Effort | Complete |
|---|---|---|
| feature-switches | 5 days | 95% |
| announcements | 3 days | 0% |
| see-announcement | 2 days | 0% |
| limits | 4 days | 0% |
| settings | 2 days | 0% |

Feature switches are built end to end (journey 23): the switches in the database behind a
30-second snapshot, the Features page with its dialogs, and the Popkin app reading a Popkin's
switches every minute. Its optional reason uses `pk-textarea` until `pk-reason-field` is built. Announcements, limits and settings are journey 28.
