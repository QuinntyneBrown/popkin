# 0024. Admins, moderation and feature switches are kept in the database

## Status

Proposed, 15 November 2026. Amends [ADR 0016](0016-admin-app.md); supersedes its `Admin:Accounts`
setting, its on/off `FeatureSwitch` and its `FeatureSwitched` event, and answers its last
consequence. Narrows [ADR 0023](0023-features-switched-on-by-a-setting.md) for Plan and Schedules.

## Context

ADR 0016 was written when the admin app had one task, the feature switches (L2-076 to L2-078). On
15 November 2026 the owner settled four questions (`docs/specs/L1.md`, Notes) and the admin app
gained L1-021 to L1-028 and L2-086 to L2-120:

- Admins are added, removed and given a role (Owner, Support, Viewer) in the app; configuration
  names only the first Owner (L2-078 AC1, L2-119).
- An admin sees what a member reported with the messages around it, and an Owner or Support admin
  may open one Popkin's Everyone thread, album and experiences, read-only, for a recorded reason
  (L2-109, L2-111). ADR 0016 said such a feature needs its own decision record.
- Each feature is Off, on for chosen Popkins, or on for everyone (L2-076).
- Every change carries a reason and is recorded in an audit log nobody can edit (L2-087, L2-120).

ADR 0016 also had `PopkinHub` send `FeatureSwitched` to every open screen, which breaks the shared
real-time rule that nothing is sent to all connections (`docs/detailed-designs/README.md`).

## Decision

- **Admins are rows, not settings.** `Admin` (staff email at `@popkin.app`, name, `AdminRole`) and
  `AdminSession` live in the database. `Admin:FirstOwner` names the first Owner, whom the API adds
  at start-up when absent. An admin is not a `Person`; inside the Popkin app an admin is an
  ordinary person.
- **The admin session is its own cookie**, `__Host-popkin-admin`, host-only on
  `admin.popkin.community`, with its own authentication scheme, re-checked on every request so a
  removed admin or a changed role applies at once (L2-078 AC5, AC7; L2-086 AC5). It replaces
  ADR 0016's `__Secure-popkin-admin`: a host-only cookie is never sent to a Popkin's address.
- **The role is checked in the handler**, against one table (`AdminPermissions`, L2-086), through
  `IAdminGuard`; a controller only requires the admin scheme.
- **Every admin change writes an `AuditEntry` in the same transaction** (`IAuditLog`). No endpoint
  changes or deletes one; entries older than two years are deleted by the Worker.
- **Moderation reaches content in two ways only.** A report shows its item and up to five messages
  either side from the same thread; a moderation view (`ModerationView`, 30 minutes, a reason,
  audited when opened and closed) shows one Popkin's Everyone thread, album and experiences,
  read-only. A direct message is shown only when one of its members reported it, and only its
  context. Every other admin endpoint returns no message, photo, comment, reaction, experience,
  story, time off or hours (L2-078 AC4). The Privacy notice says so.
- **Feature switches are rows with a mode**, `FeatureSetting` (Off, Chosen, Everyone) and
  `FeatureChosenPopkin`, read through `IFeatureSwitches.IsOn(Feature, popkinId)`, cached and
  refreshed at least once a minute. `Features:Schedules` is retired; `Features:PhoneSignIn` stays
  a setting under ADR 0023.
- **What every person must see is polled, not pushed.** Open screens learn a switch or an
  announcement by reading it every 60 seconds; no event goes to all connections.

## Consequences

- The detailed designs under `docs/detailed-designs/admin-*` and `moderation/` follow this record.
- The Privacy notice (L2-083) gains what moderation may see.
- Azure Front Door sends `*.popkin.community` to the Popkin web app (ADR 0020); `admin` needs its
  own route to the admin app.
- The Worker gains work the admin app needs (a person's data export, the audit log's two-year
  deletion), beyond the four jobs L2-113 names.
- The tests of the Schedules switch change from a setting to a row.
