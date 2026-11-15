# Habits

## Overview

Popkin is a platform for pop-up communities. Contacts is a person's own address book inside the
Popkin web app, seen by nobody else (L1-029). Habits is the Contacts page of the rhythms the
person keeps with their contacts: a Sunday call, a lunch every two weeks, a monthly catch-up
(L1-035). It shows which rhythm is overdue, how often each has been kept, and moves a habit on
when the person says it was kept. It sits at `/contacts/habits`; on a phone it is reached from
Today and has a "Today" back link (L2-121 AC4).

- **habit** — rhythm the person keeps with one contact, named by what they do together
- **rhythm** — how often a habit falls due: `Weekly`, `EveryTwoWeeks` or `Monthly` (`HabitRhythm`)
- **period** — one span of a habit's rhythm: a week, a fortnight or a month
- **kept** — record that the habit happened in a period (`HabitKept`)
- **last time** — day the habit was last kept, or the day it started when it has never been kept
- **due day** — last time plus the rhythm; the habit's next day
- **overdue habit** — habit whose due day has passed
- **keep strip** — row of the last 12 periods, each marked kept or not

A habit is the `Habit` and `HabitKept` entities of the shared Contacts architecture
([Contacts](../../README.md#contacts)). A contact's profile shows the contact's habit as an info
card ("Every 2 weeks", "Lunch with Chidi", "Overdue since Sep 13") from the same rules
([A contact's profile](../contact-profile/README.md)); Today lists an overdue habit under "To do
today" ([Today](../today/README.md)). Reminding the person when a habit comes due and when it
slips (L2-145 AC4) belongs to [Reminders](../reminders/README.md).

## Description

### Screens and states

Popkin web app, `docs/mocks/pages/contacts-habits/`, on Tuesday 15 September 2026:

- `default.html` — "Habits", "Small rhythms that keep people close" and "New habit". The
  overdue habit leads the page as a `spotlight`: "Two days overdue", "Lunch with Chidi", "Every 2
  weeks · you’ve kept 9 of the last 12", "Call Chidi" (a `tel:` link), "We met up" and its keep
  strip, named "Kept 9 of the last 12, the latest one is due" (L2-143 AC2). Under it, one
  `habit-row` per habit: photo, name, rhythm, keep strip ("Kept 11 of the last 12"), "11 weeks
  running" and "Next Sun, Sep 20"; each opens the contact's profile (L2-143 AC1).
- `kept.html` — after "We met up": "Logged for this fortnight", the button pressed, and the toast
  "Lunch with Chidi logged", "Your next one is due by Tue, Sep 29." with "Undo" (L2-144 AC1).
- `empty.html` — "No habits yet", "A habit is a rhythm with someone: a Sunday call, a monthly
  catch-up. We’ll nudge you when one is due, and again if it slips." and "New habit" (L2-143 AC4).
- `loading.html`, and `error.html` — "We couldn’t load your habits", "Your streaks are safe.
  Check your connection and try again." and "Try again".

`docs/mocks/dialogs/new-habit/`:

- `default.html` — "New habit"; "With" showing Ifeoma Okafor, "Sister", and "Change"; "What"
  ("Sunday call, lunch, a walk…"); "How often" as radio chips "Weekly", "Every 2 weeks" and
  "Monthly", "Weekly" chosen; "We’ll remind you when it’s due, and nudge again if a week slips
  by."; "Start the habit" (L2-145 AC1).
- `invalid.html` — "One thing to fix", "What: say what you’ll do together." linking to the field,
  and the field error "Say what you’ll do together, like “Sunday call”." (L2-145 AC2).
- `busy.html` — "Starting…", disabled.

### Conflicts and gaps

- **Counting (gap 105).** Which day a weekly or monthly habit falls on, where each period starts,
  how "Kept {n} of the last 12" and "{n} weeks running" are counted, and whether a second "We met
  up" in one period is refused, are open. The mocks disagree with any one reading: Mum's strip
  misses one of 12 yet reads "11 weeks running". The API therefore returns the days kept and the
  web app counts them with `habitKeeping`, whose period rule is `<TO SUPPLY>` until gap 105 is
  settled.
- **Last time of a new habit.** The design takes the day a habit starts as its first last time,
  so a new weekly habit is due a week later (proposal under gap 105, `<TO SUPPLY>`).
- **Several overdue habits.** Only one is drawn. Which leads, and where the others show, are
  `<TO SUPPLY>`; the design leads with the one overdue longest and lists the rest as rows.
- **Rhythm words.** Grace's row read "Every month"; the rhythm is "Monthly", and the mocks were
  changed to match (`docs/mocks/README.md` note 10).
- **A habit's name.** L2-122 AC4 names a contact by first name, so a habit reads "{what} with
  {first name}"; the mocks' "Sunday call with Mum" became "Sunday call with Ada".
- **Copy not drawn.** How lateness reads beyond "Two days overdue", the period word of a weekly or
  monthly habit ("Logged for this week" and "this month" are the design's reading), the row of a
  habit due today, and "Call {first name}" for a contact with no phone are `<TO SUPPLY>`.
- **New habit's contact.** Which contact "With" shows when the dialog opens from Habits, and what
  "Change" opens, are not drawn: `<TO SUPPLY>`. From a profile it is that contact.
- **Editing, pausing and ending** a habit are gap 105; nothing here builds them. Deleting a
  contact removes their habit and its kept periods through `ContactRemoval`
  ([Delete a contact](../delete-contact/README.md)).
- **Time zone (gap 104).** Days are calendar days with no time; the web app sends the device's date
  as the day kept, and the API accepts it within one day of its own UTC date.

### API

Every endpoint is on `HabitsController` (`Popkin.Api/Controllers/Contacts/`); each sends one
MediatR request. Another person's habit answers `404` `habit_not_found` (proposed, L2-122 AC1).

- `GET /api/contacts/habits` — `200` `HabitDto[]`: `id`, `contactId`, `contactFirstName`,
  `contactPhone`, `contactPhotoUrl`, `what`, `rhythm`, `startedOn`, `lastTime`, `dueOn`, and
  `keptOn` (the days kept, newest first, as far back as 12 periods).
- `POST /api/contacts/habits` — body `{ clientId, contactId, what, rhythm }`. `201` `HabitDto`.
  Refusals: `400` `what_required` (the summary "What: say what you’ll do together."),
  `what_too_long` (limit `<TO SUPPLY>`), `rhythm_not_allowed`; `404` `contact_not_found`.
- `POST /api/contacts/habits/{id}/kept` — body `{ clientId, keptOn }`. `201` `HabitKeptDto`
  (`keptId`, `habit`), whose `habit.dueOn` is the next one. Refusals: `400` `kept_on_out_of_range`;
  `404` `habit_not_found`.
- `DELETE /api/contacts/habits/{id}/kept/{keptId}` — "Undo". `200` `HabitDto`, as before the
  keep (L2-144 AC2); `404` `habit_not_found`.

### Backend

- **`HabitRhythm`** (Domain) — `Weekly`, `EveryTwoWeeks`, `Monthly`.
- **`Habit`** (Domain) — `Id`, `OwnerId`, `ContactId`, `What`, `Rhythm`, `StartedOn`
  (`DateOnly`), `ClientId`, `CreatedAt`, and its `HabitKept` rows. `Start(owner, contact, what,
  rhythm, startedOn, clientId, now)`; `LastTime` (latest kept day, else `StartedOn`); `DueOn()`
  is `LastTime` plus the rhythm; `IsOverdue(today)` is `today > DueOn()` (L2-143 AC3);
  `Keep(keptOn, clientId)`; `Unkeep(keptId)`.
- **`HabitSchedule`** (Domain, static) — `Next(DateOnly from, HabitRhythm)`: 7 days, 14 days, or
  one calendar month by `DateOnly.AddMonths`, which keeps the day or takes the month's last.
  `Reminders` uses the same rule.
- **`HabitKept`** (Domain) — `Id`, `HabitId`, `KeptOn` (`DateOnly`), `ClientId`, `CreatedAt`.
- **`HabitRules`** — `What(string?)` trims and refuses empty or too long text.
- **`GetHabitsQueryHandler`**, **`StartHabitCommandHandler`** (checks the contact with
  `IContactGuard.RequireOwnedAsync`), **`KeepHabitCommandHandler`** (checks `keptOn` against
  `TimeProvider`, saves once, and returns the existing row for a known `ClientId`),
  **`UnkeepHabitCommandHandler`** — in `Popkin.Application/Contacts/Habits/`.
- No hub event. No log, metric or span carries what a habit is or whom it is with.

### Frontend (Popkin web app)

- **`ContactsHabitsPage`** (`pages/contacts-habits/contacts-habits.page.ts`, route
  `/contacts/habits`, `shell: 'app'`, `page: 'contacts-habits'`) — composes `pk-contacts-page`,
  `pk-page-head` with the "Today" back link below medium screens, `pk-spotlight` for the overdue
  habit, `pk-habit-row` per habit, `pk-empty-state` and `pk-skeleton`. "New habit" opens
  `NewHabitDialog`.
- **`NewHabitDialog`** (`dialogs/new-habit/new-habit.dialog.ts`) — CDK dialog in `pk-dialog`, with
  the contact as `pk-avatar` and name, `pk-text-field` "What", `pk-choice-chips` "How often",
  `pk-form-summary` and `pk-button` "Start the habit" / "Starting…". It validates "What" before
  sending; it closes on success, and the habit then shows on Habits and the profile (L2-145 AC3).
- **`HabitsStore`** (`frontend/projects/api/src/lib/api/contacts/habits-store.ts`) — `loading |
  ready | failed`, `leading` (the overdue habit that leads), `rows`, `keep(id)` and `undo()`.
  `keep` marks the spotlight "Logged for this {period}" at once, sends through `ContactsOutbox`,
  and raises the toast "{habit} logged", "Your next one is due by {day}." with "Undo".
- **`habit-rules.ts`** (pure) — `habitDue(dueOn, today)`: `due` on the due day, `overdue` with
  the days late after it, `ahead` before it; `habitKeeping(keptOn, rhythm, today)`: the 12 cells
  of the keep strip, "{n} of the last 12" and the run (period rule `<TO SUPPLY>`, gap 105).
- **`habits-text.ts`** — "Two days overdue", "Overdue since {day}", "{rhythm} · you’ve kept {n}
  of the last 12", "{n} weeks running", "{n} months running", "Next {day}", "Logged for this
  fortnight", "{habit} logged", "Your next one is due by {day}." and the rhythm words.
- **`CONTACTS_API`** — `habits()`, `startHabit(request)`, `keepHabit(id, keptOn, clientId)`,
  `unkeepHabit(id, keptId)`.
- **`pk-keep-strip`** and **`pk-habit-row`** (components, backlog row 18) — the strip is
  `role="img"` with the label "Kept {n} of the last 12", so kept is never told by colour alone.
  **`pk-spotlight`** (row 19) — the tinted lead with its actions.

| Rhythm | Last time | Due day | Today | State |
|---|---|---|---|---|
| Weekly | Sep 13 | Sep 20 | Sep 15 | ahead, "Next Sun, Sep 20" |
| Every 2 weeks | Aug 30 | Sep 13 | Sep 15 | overdue by 2 days, "Overdue since Sep 13" |
| Every 2 weeks | Sep 15 (kept) | Sep 29 | Sep 15 | ahead, "due by Tue, Sep 29" |
| Monthly | Sep 3 | Oct 3 | Sep 15 | ahead, "Next Sat, Oct 3" |
| Monthly | Jan 31 | Feb 28 (2026) | Mar 1 | overdue by 1 day |
| Weekly | Sep 8 | Sep 15 | Sep 15 | due, not overdue |

### Tests

- API acceptance tests (InMemory, `Popkin.Api.Tests/Contacts/HabitsTests`): a habit started is
  listed with its due day; "We met up" moves the due day on; Undo puts it back; a resent keep
  saves once; "What" empty is `400` `what_required`; another person's habit is `404`
  `habit_not_found`; a day kept too far from today is `400` `kept_on_out_of_range` under
  `FakeTimeProvider`.
- Direct tests of `HabitSchedule.Next` and `Habit.IsOverdue`, one case per row of the table above.
- Unit tests (api library): `habitDue`, `habitKeeping` once gap 105 fixes the period,
  `HabitsStore` keep, undo and a failed keep, and `habits-text`.
- Playwright (`e2e/tests/contacts/habits.spec.ts`) through `ContactsHabitsPage` and
  `NewHabitDialog` with recorded responses: the overdue lead and rows as drawn, "We met up" with
  the toast and Undo, the empty and error states, New habit's invalid and busy states, and a
  habit started. `routes.ts` gains every state of `contacts-habits` and `new-habit`.
- Parity: `pk-keep-strip`, `pk-habit-row` and `pk-spotlight` in its row form.

## Requirements

| L2 ID | Refines (L1) | Requirement |
|-------|--------------|-------------|
| `L2-143` | `L1-035` | Habits: Habits lists the rhythms the person keeps. (AC1–AC4) |
| `L2-144` | `L1-035` | Keep a habit: Saying the habit was kept moves it on. (AC1–AC2) |
| `L2-145` | `L1-035` | New habit: A habit is started with one contact. (AC1–AC4) |

## Diagrams

### System context

The person keeps rhythms with their contacts in Contacts; the contacts are told nothing.

![System context for habits](diagrams/c4-context.png)

### Containers

The web app reads habits and writes keeps through the API; the Worker's reminder job reads the
same due days (owned by Reminders).

![Containers for habits](diagrams/c4-container.png)

### Components

`HabitsStore` decides what leads and what is overdue from the due days the API returns; the
handlers own the rule "last time plus rhythm".

![Components for habits](diagrams/c4-component.png)

### Class structure

A `Habit` is with one contact, has one `HabitRhythm` and many `HabitKept` rows; `HabitSchedule`
turns a last time and a rhythm into the due day.

![Class structure for habits](diagrams/class-structure.png)

### Behaviour — Habits opens

The page loads the habits and leads with the one overdue longest.

![Habits opens](diagrams/sequence-open.png)

### Behaviour — "We met up", and Undo

The keep is logged for its period and the toast offers "Undo", which removes the keep.

![Keeping a habit and undoing it](diagrams/sequence-keep.png)

### Behaviour — New habit

The dialog checks "What" first; the API saves the habit and it shows on Habits and the profile.

![Starting a new habit](diagrams/sequence-new-habit.png)
