# Estimates: admin-access

| Design | Effort | Complete |
|---|---|---|
| admin-sign-in | 3 days | 100% |
| admin-shell | 3 days | 85% |
| admin-roles | 2 days | 100% |
| give-a-reason | 2 days | 100% |
| audit-log | 3 days | 100% |
| manage-admins | 3 days | 100% |

The admin shell lacks the waiting counts beside Reports, Jobs and Album exports
(`AdminWaitingStore`): `GET /api/admin/waiting` is built, and the sidebar shows the counts once
those sections are (journeys 29 and 30).
