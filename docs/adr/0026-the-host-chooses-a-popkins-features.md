# 0026. The Host chooses a Popkin's features within what the admin app offers

## Status

Accepted, 15 November 2026. Amends [ADR 0024](0024-admins-moderation-and-switches-in-the-database.md):
a feature switch is no longer the only rule for whether a Popkin has a feature.

## Context

ADR 0024 keeps each feature's switch (Off, Chosen, Everyone) in the database, and the admin app
alone decides whether a Popkin has Plan and Schedules. The owner settled on 15 November 2026 that
the person starting a Popkin chooses whether it has them, all on unless switched off, and that the
Host changes the choice later in "Popkin settings" (L1-039, L2-152, L2-153). The admin app keeps
its switch: it still offers a feature, or withdraws it from every Popkin at once.

Every Plan and Schedules handler, the home and the recap already ask one question,
`IFeatureSwitches.IsOn(feature, popkinId)`, synchronously, from the snapshot the API holds in
memory (ADR 0009).

## Decision

- **A feature is on for a Popkin only while the admin app offers it and its Host has it on.**
  `IFeatureSwitches.IsOn` answers both, so no handler changes. `IsOffered` answers the admin app's
  part alone, for the screens that let the Host choose.
- **The Host's choice is a row only when a feature is switched off**, `PopkinFeatureOff`
  (`PopkinId`, `Feature`, `SwitchedOffAt`). A Popkin without one has the feature, so every Popkin
  made before this record keeps what it had, and the choice survives the admin app withdrawing
  and offering the feature again.
- **The snapshot holds the rows** beside the switches. A Host's change marks it stale, so the API
  honours it on the next request; open screens of other members follow within a minute by the
  poll of ADR 0024. No hub event is sent.
- **A new Popkin is offered a feature only while it is on for Everyone.** It is not among any
  feature's chosen Popkins until an admin adds it, and then the choice made when it started
  applies.
- **A refusal says who switched the feature off.** `404` `feature_off` carries `switchedOffBy`,
  `Host` or `Popkin`, so the screen can say who can switch it back on (L2-077 AC2).

## Consequences

- The admin app's counts ("On in all {n} live Popkins") describe what the admin app offers; a
  Host may still have the feature switched off. The admin panels are not changed.
- Wrapping a Popkin up does not change its choice; a wrapped-up Popkin's choice cannot change.
- Deleting a Popkin deletes its rows with it (cascade).
