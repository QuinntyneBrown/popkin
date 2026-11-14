# 0023. A feature that is not ready is switched on by a setting

## Status

Accepted, 14 November 2026. First used by phone sign-in (L2-084).

## Context

Every commit to main is deployed ([ADR 0018](0018-deploy-to-azure-on-every-commit.md)). Phone
sign-in is built, but a code reaches a phone only once Popkin's toll-free number is registered
and verified ([ADR 0021](0021-codes-and-invites-by-azure-communication-services.md)), which takes
weeks. Until then the deployed app offered "Phone" first on sign-up and every phone code answered
503 `code_not_sent`. The owner wants the option hidden now and switched on later, without
changing the app.

## Decision

- **A switch is an API setting under `Features:`**, a boolean that is off unless it is `true`.
  The first is `Features:PhoneSignIn`. Each is listed in [`docs/deployment.md`](../deployment.md).
- **The API owns the rule.** It answers what a switch allows through the endpoint of the feature
  (for phone sign-in, `GET /api/auth/channels`) and refuses what the switch does not allow, so a
  client that ignores the screen gets nothing more.
- **The app asks before the screen opens**, with a route resolver, and takes the safe answer (the
  feature off) when the API cannot answer. The app holds no switch of its own: no build-time
  flag, no environment file.
- **Tests run with the feature on**: `ApiFactory` and `eng/Start-E2eApi.ps1` set the switch, so
  the recording and the existing tests cover the feature, and the tests of the switch turn it off.
- **A switch is removed** once its feature is on everywhere for good, with its setting and its
  tests of the off state.

## Consequences

- Turning phone sign-in on is one parameter, `phoneSignIn` in `infra/main.bicep`, committed and
  deployed like any change; the Bicep owns the setting, so a deployment never undoes it. The app
  is not changed.
- The sign-in and sign-up screens wait for one small anonymous request before they open.
- A general flag service (per person, per percentage) is not built; one is decided by its own
  record if Popkin ever needs one.
