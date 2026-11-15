# Choose a Popkin's features

## Overview

Popkin is a platform for pop-up communities. Chat, Group call, Photos and Experiences are what a
*Popkin* is; Plan and Schedules are features a group may or may not need. This feature lets the
person starting a Popkin choose whether it has them, and its Host change that choice later, among
the features the admin app offers it ([ADR 0026](../../../adr/0026-the-host-chooses-a-popkins-features.md)).

- **Host** — member who started a Popkin; the only member who changes its settings
- **feature switch** — the admin app's setting of one feature: Off, Chosen Popkins or Everyone (L2-076)
- **offered** — a feature the admin app has on for a Popkin: Everyone, or Chosen with the Popkin
  among the chosen; for a Popkin not yet created, Everyone only
- **the Host's choice** — whether the Host has an offered feature switched on; on unless switched off

A feature is on for a Popkin only while it is offered and the Host has it switched on. Either
switching it off makes it off under L2-077: no tab, its screens say so, the API refuses it, and
its data is kept.

## Description

### Screens and states

- `docs/mocks/pages/what-it-has/default.html` — step 4 of 4, "What should it have?", the line
  "Chat, calls, photos and experiences are always there. Switch on anything else it needs.", two
  `setting-row`s, "Plan" (board icon) and "Schedules" (calendar icon), each with its sentence and
  switched on, and "Pop it up" (L2-152 AC1, AC3). `plan-off.html` has Plan switched off;
  `one.html` offers Schedules only; `submitting.html` reads "Popping it up…" with the switches
  disabled; `error.html` shows "We couldn't pop it up." above the switches as they were (AC4, AC5).
  From 768 px the screen is split like "How long should it last?", and the aside shows the
  Popkin's tabs as they will be, so the choice is seen as well as read.
- `docs/mocks/pages/how-long/*.html` — step 3 of 4; its action reads "Next" and opens
  "What should it have?". `submitting.html` and `error.html` show the case where nothing is
  offered: step 3 of 3 and "Pop it up" (L2-009 AC4, L2-152 AC2).
- `docs/mocks/dialogs/popkin-settings/default.html` — the Host's menu gains "Features", with the
  toggle icon and the hint "Plan and Schedules", between "Set the event" and "Invite people"
  (L2-020 AC1, L2-153 AC1).
- `docs/mocks/dialogs/popkin-features/default.html` — "Features", the two rows in the Host's
  choice, "Save" and "Cancel" (L2-153 AC2); `saving.html` ("Saving…", switches disabled, AC3);
  `error.html` ("We couldn't save your changes. Try again.", AC6).
- `docs/mocks/pages/plan-board/host-off.html` — "Plan is switched off", "Your host switched Plan
  off for this Popkin. Nothing is lost: it comes back as it was when they switch it on again in
  Popkin settings." and "Back to {Popkin name}" (L2-077 AC2). Time off, This week and the
  burn-down use the same words for their feature.

### API

- `GET /api/popkins/features` — any signed-in person; `200` `NewPopkinFeaturesDto`
  `{ offered: ["Plan", "Schedules"] }`, the features on for Everyone, in that order (L2-152 AC8).
- `POST /api/popkins` — the body gains `plan` and `schedules` (bool, optional). `false` switches
  the feature off for the new Popkin; absent or `true` leaves it on (L2-152 AC7). The choice is
  stored whether or not the feature is offered, so it applies if an admin offers it later.
- `GET /api/popkins/{popkinId}/features` — any member; `PopkinFeaturesDto` `{ plan, schedules,
  choices: [{ feature: "Plan", on: true }, …] }`. `plan` and `schedules` are whether each is on;
  `choices` lists the offered features and the Host's choice of each (L2-153 AC8). Open screens
  keep reading it every 60 seconds (L2-077 AC4).
- `PUT /api/popkins/{popkinId}/features` — the Host; body `{ plan?: bool, schedules?: bool }`, an
  absent feature unchanged; `200` `PopkinFeaturesDto`. Failures: `403` `host_only`, `409`
  `popkin_wrapped_up` (`IMembershipGuard.RequireHostAsync`), `404` `feature_off` with nothing
  saved when the body names a feature that is not offered (L2-153 AC7).
- `404` `feature_off` gains the extension `switchedOffBy`: `Popkin` when the admin app has the
  feature off for the Popkin, `Host` when only the Host's choice has it off.

### Backend

- **`PopkinFeatureOff`** (`Popkin.Domain`) — `PopkinId`, `Feature`, `SwitchedOffAt`; key
  (`PopkinId`, `Feature`), cascade on the Popkin. A row means the Host switched the feature off.
  `IAppDbContext.PopkinFeaturesOff`; migration `AddPopkinFeaturesOff`.
- **`IFeatureSwitches`** — `IsOffered(feature, popkinId)` is the admin app's answer (ADR 0024);
  `IsOn(feature, popkinId)` is `IsOffered && !switched off by the Host`; `IsOfferedToNew(feature)`
  is Mode Everyone. `Require` throws `feature_off` with `switchedOffBy`.
- **`PlatformSnapshot`** — loads `PopkinFeatureOff` with the switches into `PlatformValues`
  (`HostOff`, a set per feature). Saving a choice calls `IPlatformSnapshot.Invalidate()`.
- **`CreatePopkinCommand`** gains `bool? Plan, bool? Schedules`; the handler adds a
  `PopkinFeatureOff` for each `false` in the same unit of work, then invalidates the snapshot.
- **`GetNewPopkinFeaturesQuery`**, **`GetPopkinFeaturesQuery`** (now with `choices`) and
  **`ChangePopkinFeaturesCommand`** (`RequireHostAsync`, refuses an unoffered feature, adds or
  removes rows, saves, invalidates). The controller sends one request each.
- No hub event: other members' screens follow by the 60-second read (ADR 0024).

### Frontend (Popkin web app)

- **`NewPopkinDraft`** gains `features: { plan: boolean; schedules: boolean }`, both `true` at
  first and after `reset()`; going back and forth keeps them (L2-152 AC6).
- **`newPopkinFeaturesResolver`** on `/new`, `/new/length` and `/new/features` reads
  `GET /api/popkins/features` once; a failure is the safe answer, nothing offered (ADR 0023).
- **`HowLongPage`** — when something is offered, the step indicator reads 3 of 4 and the action
  "Next" opens `/new/features`; otherwise 3 of 3 and "Pop it up" as before. "Name your Popkin"
  reads 2 of 4 or 2 of 3.
- **`WhatItHasPage`** (`pages/what-it-has/what-it-has.page.ts`, route `/new/features`,
  `data-page="what-it-has"`, `signedInGuard`, `shell: 'bare'`) — `pk-screen` split, `pk-top-bar`
  (back to `/new/length`, step 4 of 4), a `pk-setting-row` per offered feature, `pk-alert` on
  failure and `pk-button` "Pop it up" / "Popping it up…". Creating moves from `HowLongPage` into
  `NewPopkinCreator` (`api` library), which both pages call, with the draft's features.
  Opened with nothing offered, it goes to `/new/length`.
- **`PopkinSettingsDialog`** — `featuresHint` (undefined hides "Features"); `PopkinSetting` gains
  `'features'`. The home reads `GET …/features` when the Host opens the menu.
- **`PopkinFeaturesDialog`** (`dialogs/popkin-features/`) — `pk-dialog-frame` "Features", a
  `pk-setting-row` per choice, "Save" / "Saving…" and "Cancel"; on success it closes with the
  new `PopkinFeaturesView`, which `PopkinFrame.applyFeatures` takes at once, and the home toasts
  "Features saved" (L2-153 AC3); on failure it stays open with the switches and a `pk-alert`.
- **`featuresHint(choices)`** (`api`) — "Plan and Schedules", "Plan", "Schedules" or "All off".
- **Off screens** — `PlanBoardStore`, `BurnDownStore`, the time-off and this-week stores keep
  `switchedOffBy` from the problem; `featureOffText(feature, by)` gives the words.

### Decisions

- The Host's choice is stored only as "off", so Popkins made before it need no data change.
- A new Popkin is offered only features on for Everyone: one on for chosen Popkins cannot be on
  for a Popkin nobody has chosen yet. The default choice is on, so it appears if it is added.
- The admin app's panels are unchanged and describe what it offers (ADR 0026).

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-152` | `L1-039`, `L1-003` | Choose the features when starting a Popkin |
| `L2-153` | `L1-039` | The Host changes a Popkin's features |
| `L2-009` | `L1-003` | Choose how long a Popkin lasts (AC4: "Next" when a feature is offered) |
| `L2-020` | `L1-006` | Popkin settings (AC1: "Features") |
| `L2-077` | `L1-019` | A feature that is off (on only while offered and switched on; AC2 words) |
