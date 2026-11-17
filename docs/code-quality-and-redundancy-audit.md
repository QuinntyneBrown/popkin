# Code Quality and Redundancy Audit

17 November 2026

This document records the findings of a code-level audit of the Popkin repository (`backend/`, `frontend/`, and `e2e/`) against the architecture, testing, and presentation rules in [`AGENTS.md`](../AGENTS.md) and [`docs/adr/`](adr/README.md).

Findings are grouped into two parts:

1. **[Code Quality, Bugs, Performance, and Rule Compliance](#1-code-quality-bugs-performance-and-rule-compliance)** (`CQ-01` to `CQ-16`)
2. **[Redundant, Duplicated, and Dead Code](#2-redundant-duplicated-and-dead-code)** (`RD-01` to `RD-16`)

---

## Summary Table

### Part 1 — Code Quality, Bugs, Performance, and Rule Compliance

| ID | Severity | Area | Finding | Location |
|---|---|---|---|---|
| `CQ-01` | **High** | Backend (`Contacts`) | `GetPeopleQueryHandler` never queries `TimelineEntries` and hardcodes `LastTalkedOn: null, LastTalkedDays: null`, contradicting its contract and `L2-126` | `backend/src/Popkin.Application/Contacts/People/GetPeople.cs:62-63` |
| `CQ-02` | **High** | Backend (`Contacts`) | Unhandled `JsonException` and null deserialization (`!`) in `ContactsPeopleController.Add`/`Edit` cause `500 Internal Server Error` instead of `400`, plus missing `[RequestSizeLimit]` / `[RequestFormLimits]` | `backend/src/Popkin.Api/Controllers/Contacts/ContactsPeopleController.cs:27-34, 81-87` |
| `CQ-03` | **High** | Backend (`Features`) | Concurrency race and non-atomic `DateTimeOffset?` read in `PlatformSnapshot.RefreshIfStaleAsync`: setting `_stale = false` and `_loadedAt` before the DB read lets concurrent requests bypass `_loading` and read stale/empty switches | `backend/src/Popkin.Infrastructure/Features/PlatformSnapshot.cs:19-68` |
| `CQ-04` | **High** | Backend (`Auth`) | `ConfirmCodeCommandHandler` hardcodes `PhotoUrl: null` in the returned `SessionDto`, losing an existing user's profile avatar in `SessionStore` until page reload | `backend/src/Popkin.Application/Auth/ConfirmCode.cs:90` |
| `CQ-05` | **High** | Frontend (`api` Outboxes) | Privacy & multi-user bug (`L2-054`): `MessageOutbox` (`popkin.outbox`), `ContactsOutbox` (`popkin.contacts-outbox`), and `DraftStore` are not cleared on sign-out, account deletion, or `401`, and failed `ContactsOutbox` entries are never purged | `frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts:108-114`, `dialogs/sign-out/sign-out.dialog.ts:56-64` |
| `CQ-06` | **Medium** | Frontend (`popkin` Auth) | **Resolved.** `unauthorizedInterceptor` does not call `realtime.stop()` on `401`, leaving the SignalR hub connection open after session expiration/revocation | `frontend/projects/popkin/src/app/guards/unauthorized.interceptor.ts:21-29` |
| `CQ-07` | **Medium** | Frontend (`popkin` Dialogs) | **Resolved.** Five destructive confirmation dialogs (`delete-experience`, `delete-story`, `delete-contact`, `delete-photo`, `leave-popkin`) omit `ref.disableClose = true` and do not disable their Cancel/Keep button while `busy()` | `frontend/projects/popkin/src/app/dialogs/delete-*/` |
| `CQ-08` | **Medium** | Backend (`Contacts`) | N+1 query in `GroupReads`/`GroupRules.ContactsAsync` (`foreach` awaiting `RequireOwnedAsync`), missing `.AsNoTracking()` across 6 read queries in `GetTodayQueryHandler`, and full-history `TimelineEntries` note scan in memory | `backend/src/Popkin.Application/Contacts/Today/Today.cs:105-157`, `Groups/Groups.cs:97-107` |
| `CQ-09` | **Medium** | Backend (`Auth`) | `ValidateSessionQueryHandler` executes two sequential DB queries (`Sessions` then `People`) on every authenticated HTTP request | `backend/src/Popkin.Application/Auth/Sessions.cs:14-23` |
| `CQ-10` | **Medium** | Backend (`Domain`) | `Admin.NameFrom(email)` does not clamp the derived name to `Person.MaxNameLength` (40 chars), risking DB column truncation for long email local parts | `backend/src/Popkin.Domain/Admin.cs:87-92` |
| `CQ-11` | **Medium** | Backend (`Domain`) | `PlanHistory.Days(today)` returns 1 future day when `today < FirstDay` due to `+ 1` outside `Math.Max(0, ...)`, and `PlanHistory` rescans `changes` $O(D \times C)$ times instead of memoizing | `backend/src/Popkin.Domain/PlanHistory.cs:38-53, 73-106` |
| `CQ-12` | **Medium** | Backend (`Photos` / `Chat`) | Inconsistent ProblemDetails `code` for invalid emoji reactions (`reaction_invalid` in `ReactionValidator.Require` vs `emoji_not_allowed` in `PhotoReactions.RequireAsync`) | `backend/src/Popkin.Application/Photos/ReactToPhoto.cs:77-80`, `Chat/ReactionValidator.cs:21-22` |
| `CQ-13` | **Low** | Backend (`Domain`) | `ExperienceScore.Of` and `CountFor` do not bounds-check `stars` (`1..5`), throwing `IndexOutOfRangeException` on invalid input | `backend/src/Popkin.Domain/ExperienceScore.cs:24-33` |
| `CQ-14` | **Low** | Backend (`Controllers`) | `ExperiencesController.Edit` and `AdminAuditController.Export` perform form-field presence logic and clock/CSV byte formatting inside controllers (`AGENTS.md` controller rule) | `backend/src/Popkin.Api/Controllers/ExperiencesController.cs:66-78`, `AdminAuditController.cs:10, 22-28` |
| `CQ-15` | **Low** | Frontend (`popkin` / `e2e`) | **Resolved.** `AGENTS.md` violations: forbidden `stack--sm` class and raw `<ul><li><strong>` markup in `delete-account.dialog.html`; 7 active components missing parity specs in `e2e/tests/parity/`; chat helpers in `pages/conversations/` instead of `api` | `frontend/projects/popkin/src/app/dialogs/delete-account/delete-account.dialog.html:10-13`, `pages/conversations/` |
| `CQ-16` | **Low** | Frontend (`api` Naming) | Inconsistent store naming (`7` `*.store.ts` vs `30` `*-store.ts` vs `2` `*-state.ts`), type drift on `accent` (`string` vs `PopkinColour`) and `colour`, and chronological barrel order in `public-api.ts` | `frontend/projects/api/src/public-api.ts:5-170`, `src/lib/models/*.ts` |

### Part 2 — Redundant, Duplicated, and Dead Code

| ID | Category | Area | Summary | Location |
|---|---|---|---|---|
| `RD-01` | Exact Duplication | Frontend (`api`) | **Resolved.** `LocalOutboxStorage` and `LocalContactsOutboxStorage` are 100% identical except for the `localStorage` key constant (`'popkin.outbox'` vs `'popkin.contacts-outbox'`), and `LocalPopkinsSnapshot` duplicates `storage()` | `frontend/projects/api/src/lib/api/chat/local-outbox-storage.ts`, `contacts/local-contacts-outbox-storage.ts` |
| `RD-02` | Near-Duplicate | Frontend (`api`) | **Resolved.** `MessageOutbox` and `ContactsOutbox` duplicate offline queue state machines, `Sending -> Waiting` reload recovery, `inFlight` pumping, and in-memory `File` map handling | `frontend/projects/api/src/lib/api/chat/message-outbox.ts`, `contacts/contacts-outbox.ts` |
| `RD-03` | Near-Duplicate | Frontend (`popkin` & `admin`) | **Resolved.** Duplicated route guards (`signedInGuard` vs `adminSessionGuard`, `signedOutGuard` vs `signedOutAdminGuard`) and `401` HTTP interceptors (`unauthorizedInterceptor` vs `adminAuthInterceptor`) | `frontend/projects/popkin/src/app/guards/*.ts`, `projects/admin/src/app/guards/*.ts` |
| `RD-04` | Exact / Structural Duplication | Frontend (`popkin` Dialogs) | **Resolved.** `delete-message.dialog` and `delete-comment.dialog` are identical; 5 async delete/leave dialogs (`delete-experience`, `delete-story`, `delete-contact`, `delete-photo`, `leave-popkin`) duplicate the `busy`/`failed` state machine that `admin` extracted to `ActionDialogState` | `frontend/projects/popkin/src/app/dialogs/delete-*/`, `leave-popkin/` |
| `RD-05` | Duplicated Logic | Frontend (`popkin`) | **Resolved.** Client-side session teardown (`realtime.stop()`, `sessions.clear()`, `snapshot.clear()`, scroll reset) is duplicated across `sign-out.dialog.ts`, `delete-account.dialog.ts`, and `unauthorized.interceptor.ts` | `frontend/projects/popkin/src/app/dialogs/sign-out/`, `delete-account/`, `guards/unauthorized.interceptor.ts` |
| `RD-06` | Unused Code (24 Components) | Frontend (`components` & `api`) | **Resolved.** 24 `pk-*` components in `frontend/projects/components/src/lib/` (plus `trendChartOf` in `api`) have zero usages across `popkin`, `admin`, `marketing`, and parent components (built ahead of unbuilt admin screens under ADR 0025) | `frontend/projects/components/src/lib/*` (see full list in `RD-06`) |
| `RD-07` | Overlapping Components | Frontend (`components`) | **Resolved.** 5 overlapping key-value/definition-list components (`contact-facts`, `facts`/`fact`, `key-values`, `settings-list`, `stat-pair`) and 8 overlapping chip-bar components (`chip`, `choice-chips`, `drift-chips`, `filter-chips`, `group-chips`, `toggle-chips`, `week-chips`, `who-chips`) | `frontend/projects/components/src/lib/*` |
| `RD-08` | Duplicated Types & Models | Frontend (`api/models`) | **Resolved.** Duplicate `Feature` (`admin.ts:108`) vs `PopkinFeature` (`home.ts:50`); 4 identical member summary interfaces (`MessageAuthorView`, `MemberJoinedView`, `KeenMemberView`, `StoryOwnerView`) + 3 inline copies; 10 duplicated contact identity shapes; duplicate upload event unions | `frontend/projects/api/src/lib/models/*.ts` |
| `RD-09` | Near-Duplicate | Backend (`Api/Auth` & `Domain`) | `SessionCookie` vs `AdminSessionCookie` (cookie options, `SignInAsync`, `ValidatePrincipal`, `HttpCurrentPerson` vs `HttpCurrentAdmin`) and `Session` vs `AdminSession` domain entities | `backend/src/Popkin.Api/Auth/SessionCookie.cs`, `AdminSessionCookie.cs`, `Popkin.Domain/Session.cs`, `AdminSession.cs` |
| `RD-10` | Near-Duplicate | Backend (`Application/Auth`) | `ConfirmCodeCommandHandler` vs `ConfirmAdminCodeCommandHandler` and `RequestCode` vs `RequestAdminCode` duplicate verification code lookup, expiration/consumption checks, hash verification, and `DbUpdateConcurrencyException` handling | `backend/src/Popkin.Application/Auth/ConfirmCode.cs`, `Administration/Auth/ConfirmAdminCode.cs` |
| `RD-11` | Near-Duplicate | Backend (`Chat` & `Photos`) | `MessageReaction` vs `PhotoReaction` entities and `Reactions.Summary` vs `PhotoReactions.OfAsync` emoji grouping/ordering queries | `backend/src/Popkin.Domain/MessageReaction.cs`, `PhotoReaction.cs`, `Application/Chat/Reactions.cs`, `Photos/ReactToPhoto.cs` |
| `RD-12` | Repeated Boilerplate | Backend (`Api/Controllers`) | 7 controller actions repeat `await using var content = photo?.OpenReadStream(); var upload = photo is null ? null : new PhotoUpload(content!, photo.Length);`, and `PhotoUpload` lives in `Popkin.Application.Invites` | `AccountController.cs`, `ContactMemoriesController.cs`, `ContactsPeopleController.cs`, `ExperiencesController.cs` |
| `RD-13` | Repeated Helpers | Backend (`Domain` & `Application`) | Duplicated canonical `Guid` pair ordering (`ChatThread.OrderedPair` vs `Connection.Order`), string trim-to-null (`Contact.Clean`, `FollowUp.Trimmed`, inline), and contact avatar projection (`PersonName.FirstName`, `PersonName.Initials`, `AvatarAccent.For`, `photos.GetReadUrl`) across 8 Contacts handlers | `Popkin.Domain/ChatThread.cs`, `Connection.cs`, `Contact.cs`, `FollowUp.cs`, `Popkin.Application/Contacts/**` |
| `RD-14` | Unused Enum Values | Backend (`Domain`) | `AdminAction` (18 of 21 values), `AuditAction` (26 of 33 values), and `AuditTargetKind` (9 of 12 values) declare constants for unbuilt admin features with no handlers or controllers | `backend/src/Popkin.Domain/AdminAction.cs`, `AuditAction.cs`, `AdminPermissions.cs` |
| `RD-15` | Repeated Boilerplate | Frontend (`api` Stores) | **Resolved.** 300 ms delayed-loading timer boilerplate (`slow?: ReturnType<typeof setTimeout>`, `DestroyRef.onDestroy`, `pending -> loading -> ready/error`) is copy-pasted across 20+ stores in `frontend/projects/api` | `frontend/projects/api/src/lib/api/**/*-store.ts` |
| `RD-16` | Fragmented Helpers | Frontend (`api` Text) | **Resolved.** 33 separate `*-text.ts` files (14 in `contacts/` alone) re-implement overlapping pluralization, relative day/weekday formatting, and ProblemDetails error-to-message mapping | `frontend/projects/api/src/lib/api/**/*-text.ts` |

---

## 1. Code Quality, Bugs, Performance, and Rule Compliance

### `CQ-01` (High) — `GetPeopleQueryHandler` Never Loads `TimelineEntries` and Hardcodes `LastTalkedOn` / `LastTalkedDays` to `null`

- **Location**: `backend/src/Popkin.Application/Contacts/People/GetPeople.cs:28-33, 61-63`
- **Problem**:
  `GetPeopleQuery`'s XML documentation states:
  > *"The next key date and last talked join with Key dates and Log."*

  And `ContactRowDto` declares `DateOnly? LastTalkedOn, int? LastTalkedDays` (lines 20–21). However, `GetPeopleQueryHandler.Handle` only queries `db.Contacts` and `db.KeyDates`, and passes `null, null` for `LastTalkedOn` and `LastTalkedDays`:
  ```csharp
  // backend/src/Popkin.Application/Contacts/People/GetPeople.cs:61-63
  next.TryGetValue(c.Id, out var soonest) ? NextDate(soonest.Date, soonest.On!.Value, today) : null,
  null,
  null))
  ```
  By contrast, `GroupReads.ReadAsync` (`backend/src/Popkin.Application/Contacts/Groups/Groups.cs:123-128`) and `Connections.cs` query `db.TimelineEntries` for `TimelineEntryKind.Conversation` to populate `LastTalkedOn` and `LastTalkedDays`. Because `GetPeopleQueryHandler` hardcodes `null, null`, the People list never receives conversation dates from the API.
- **Recommendation**:
  Query `db.TimelineEntries.OwnedBy(current.PersonId).AsNoTracking().Where(e => e.Kind == TimelineEntryKind.Conversation)` grouped by `ContactId` (taking `Max(e => e.Day)`) in `GetPeopleQueryHandler`, matching `GroupReads.ReadAsync`, and pass `lastTalkedOn` and `today.DayNumber - lastTalkedOn.DayNumber` into `ContactRowDto`.

---

### `CQ-02` (High) — Unhandled `JsonException` and Null Deserialization in `ContactsPeopleController`, Plus Missing Request Size Limits

- **Location**: `backend/src/Popkin.Api/Controllers/Contacts/ContactsPeopleController.cs:27-34, 81-87`
- **Problem**:
  1. Both `Add` and `Edit` deserialize the `[FromForm] string contact` multipart field directly in the controller without catching `JsonException` or checking for `null`:
     ```csharp
     // backend/src/Popkin.Api/Controllers/Contacts/ContactsPeopleController.cs:31-32
     var added = await sender.Send(
         new AddContactCommand(JsonSerializer.Deserialize<SaveContactRequest>(contact, Json)!, upload), cancellationToken);
     ```
     If a client sends malformed JSON in the `contact` form field, `JsonSerializer.Deserialize` throws `System.Text.Json.JsonException`, which is not a `ProblemException` and falls through to `UnexpectedExceptionHandler` as an unhandled `500 Internal Server Error` instead of `400 Bad Request`. If a client sends `contact="null"`, `Deserialize` returns `null` (masked by `!`), causing a `NullReferenceException` inside the handler.
  2. Unlike `AccountController.ChangePhoto` (`AccountController.cs:40-41`), `ExperiencesController.Share`/`Edit` (`ExperiencesController.cs:44-45, 64-65`), and `ContactMemoriesController.AddPhoto`/`AddFile` (`ContactMemoriesController.cs:28-29, 44-45`), neither `ContactsPeopleController.Add` nor `ContactsPeopleController.Edit` has `[RequestSizeLimit]` or `[RequestFormLimits]`.
- **Recommendation**:
  1. Move JSON deserialization into a shared helper or into the command handler that catches `JsonException` and `null` and throws `ProblemException.Invalid(...)` (`400`).
  2. Decorate `ContactsPeopleController.Add` and `Edit` with `[RequestSizeLimit(2 * AvatarPhotos.MaxBytes)]` and `[RequestFormLimits(MultipartBodyLengthLimit = 2 * AvatarPhotos.MaxBytes)]`.

---

### `CQ-03` (High) — Concurrency Race and Non-Atomic `DateTimeOffset?` Access in `PlatformSnapshot`

- **Location**: `backend/src/Popkin.Infrastructure/Features/PlatformSnapshot.cs:19-71`
- **Problem**:
  ```csharp
  // backend/src/Popkin.Infrastructure/Features/PlatformSnapshot.cs:20-21, 31-49, 70
  private DateTimeOffset? _loadedAt;
  private volatile bool _stale = true;
  ...
  public async Task RefreshIfStaleAsync(CancellationToken cancellationToken)
  {
      if (!IsStale())
      {
          return;
      }

      await _loading.WaitAsync(cancellationToken);
      try
      {
          if (!IsStale())
          {
              return;
          }

          // Marked fresh before the read, so a change saved while it reads marks it stale again.
          _stale = false;
          _loadedAt = clock.GetUtcNow();
          using var scope = scopes.CreateScope();
          ...
  ```
  1. **Premature freshness race**: Thread A acquires `_loading` and immediately sets `_stale = false` and `_loadedAt = clock.GetUtcNow()` *before* executing the three async EF Core queries (`db.FeatureSettings`, `db.FeatureChosenPopkins`, `db.PopkinFeaturesOff`). If Thread B calls `RefreshIfStaleAsync` while Thread A is awaiting the database, Thread B's fast-path `if (!IsStale()) return;` runs outside `_loading`, sees `_stale == false` and `_loadedAt == now`, and returns immediately while `_values` is still `PlatformValues.Empty` (or the pre-invalidation snapshot).
  2. **Non-atomic struct read/write**: `DateTimeOffset?` is a 24-byte value type. Writing `_loadedAt` inside `_loading` while reading it without a lock in `IsStale()` is not atomic on .NET and can produce torn reads.
  3. **Unbounded table scan**: Line 53 loads every row of `db.PopkinFeaturesOff` across all Popkins in history (including wrapped-up Popkins) every 30 seconds.
- **Recommendation**:
  Keep `_stale = false` before the DB read (so a concurrent `Invalidate()` sets `_stale = true`), but only update `_loadedAt` (stored as `long _loadedAtUtcTicks` read/written via `Volatile.Read`/`Volatile.Write`) *after* `_values` has been assigned. Filter `FeatureChosenPopkins` and `PopkinFeaturesOff` to active Popkins if wrapped-up Popkins do not need live switch lookups.

---

### `CQ-04` (High) — `ConfirmCodeCommandHandler` Drops `PhotoUrl` for Returning Users

- **Location**: `backend/src/Popkin.Application/Auth/ConfirmCode.cs:88-92`
- **Problem**:
  When an existing user (`isNew == false`) who has an account photo confirms a sign-in code, `ConfirmCodeCommandHandler` constructs `SessionDto` with `PhotoUrl: null`:
  ```csharp
  // backend/src/Popkin.Application/Auth/ConfirmCode.cs:88-92
  return new ConfirmCodeResult(
      ConfirmOutcome.SignedIn,
      new SessionDto(person.Id, person.Name, null),
      isNew,
      new StartedSession(session.Id, person.Id, session.ExpiresAt));
  ```
  By contrast, `GetSessionQueryHandler` (`backend/src/Popkin.Application/Auth/Sessions.cs:34`) returns `new SessionDto(person.Id, person.Name, Account.AccountDtos.PhotoUrl(person, photos))`. On the frontend, `VerifyCodePage` passes the `ConfirmCodeResult`'s `session` directly to `SessionStore.set(session)`, so a returning user's avatar is missing in `SessionStore` for the entire session until a full browser reload triggers `GET /api/auth/session`.
- **Recommendation**:
  Inject `IPhotoStore photos` into `ConfirmCodeCommandHandler` and pass `Account.AccountDtos.PhotoUrl(person, photos)` instead of `null`.

---

### `CQ-05` (High) — Personal Data in `MessageOutbox`, `ContactsOutbox`, and `DraftStore` Survives Sign-Out, Account Deletion, and Failed Writes

- **Locations**:
  - `frontend/projects/api/src/lib/api/chat/message-outbox.ts:54-56`
  - `frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts:49-53, 108-114`
  - `frontend/projects/api/src/lib/api/chat/draft-store.ts`
  - `frontend/projects/popkin/src/app/dialogs/sign-out/sign-out.dialog.ts:56-64`
  - `frontend/projects/popkin/src/app/dialogs/delete-account/delete-account.dialog.ts:58-66`
- **Problem**:
  1. **Cross-account leakage & `L2-054` violation**: While `PopkinsSnapshot` (`popkin.my-popkins`) is keyed by `personId` and explicitly cleared on sign-out, account deletion, and `401`, neither `MessageOutbox` (`localStorage['popkin.outbox']`), `ContactsOutbox` (`localStorage['popkin.contacts-outbox']`), nor `DraftStore` is keyed by `personId` or cleared when signing out or deleting an account. Even worse, if Person A queues an offline contact addition in `ContactsOutbox`, signs out, and Person B signs in on the same browser, `ContactsOutbox` will send Person A's queued contact to Person B's Contacts book!
  2. **Unbounded retention of failed `ContactsOutbox` entries**: In `ContactsOutbox.sendWaiting()` (`contacts-outbox.ts:108-112`), when the API rejects an entry with `4xx`, its state is set to `'Failed'` and saved to `localStorage['popkin.contacts-outbox']`. Unlike `MessageOutbox` (which exposes `retry` and `discard`), `ContactsOutbox` has no method to remove or retry `'Failed'` entries, so rejected contact payloads remain in `localStorage` indefinitely.
- **Recommendation**:
  1. Clear `MessageOutbox`, `ContactsOutbox`, and `DraftStore` on sign-out, account deletion, and `401` (and scope persisted outbox keys by `personId`, as `PopkinsSnapshot` does).
  2. Remove `4xx`-rejected entries from `ContactsOutbox` once the danger toast has been shown (or provide an explicit retry/discard mechanism).

---

### `CQ-06` (Medium) — `unauthorizedInterceptor` Leaves SignalR Hub Connection Open on `401`

- **Location**: `frontend/projects/popkin/src/app/guards/unauthorized.interceptor.ts:21-29`
- **Problem**:
  When a user signs out (`sign-out.dialog.ts:58`) or deletes their account (`delete-account.dialog.ts:60`), the app calls `this.realtime.stop()`, `this.sessions.clear()`, and `this.snapshot.clear()`. However, when `unauthorizedInterceptor` catches an unexpected `401` (e.g., revoked or expired session), it calls `sessions.clear()` and `snapshot.clear()` but never calls `inject(POPKIN_REALTIME).stop()`. The active WebSocket/SignalR connection remains open in the background while the user is redirected to `/sign-in`.
- **Recommendation**:
  Centralize client session teardown in one service method called by `sign-out.dialog.ts`, `delete-account.dialog.ts`, and `unauthorized.interceptor.ts`.
- **Resolution**:
  Resolved 17 November 2026 (3ccccc54): `SessionTeardown` (`api/auth/session-teardown.ts`) closes the live connection and forgets the session and the saved list of My Popkins for sign out, account deletion and the 401 interceptor alike; `session-ended.spec.ts` proves a 401 closes the hub connection.

---

### `CQ-07` (Medium) — Five Destructive Confirmation Dialogs Allow Dismissal While `DELETE` Request Is in Flight

- **Locations**:
  - `frontend/projects/popkin/src/app/dialogs/delete-experience/delete-experience.dialog.ts:30-41` (`.html:22-31`)
  - `frontend/projects/popkin/src/app/dialogs/delete-story/delete-story.dialog.ts:39-50` (`.html:24-33`)
  - `frontend/projects/popkin/src/app/dialogs/delete-contact/delete-contact.dialog.ts:40-54` (`.html:23-33`)
  - `frontend/projects/popkin/src/app/dialogs/leave-popkin/leave-popkin.dialog.ts:32-43` (`.html:24-34`)
  - `frontend/projects/popkin/src/app/dialogs/delete-photo/delete-photo.dialog.ts:29-32` (`.html:23-31`)
- **Problem**:
  `sign-out.dialog.ts` (line 36), `delete-account.dialog.ts` (line 55), and `admin-remove.dialog.ts` (line 36) set `this.ref.disableClose = true` while a destructive request is in flight and bind `[disabled]="busy()"` on the Cancel button. The five dialogs listed above do neither: a user can press `Escape`, click the backdrop, or click "Cancel"/"Keep" while the `DELETE` request is in flight, causing the dialog to close as `false` right before the `next` callback navigates or mutates page state.
- **Recommendation**:
  Set `this.ref.disableClose = true` during the in-flight request (resetting on error) and bind `[disabled]="busy()"` on the secondary cancel button across all five dialogs.
- **Resolution**:
  Resolved 17 November 2026 (20453417): `ConfirmDialogState` (`api/dialogs/confirm-dialog-state.ts`) sets `disableClose` while busy in all five dialogs, sign out and Delete your account, which also disable their cancel button; `pk-dialog`'s backdrop and Close now respect `disableClose` too. L2-056 AC8, the busy mocks and a behaviour test per dialog say so.

---

### `CQ-08` (Medium) — N+1 Queries, Missing `.AsNoTracking()`, and Full-History Note Scan in Contacts Handlers

- **Locations**:
  - `backend/src/Popkin.Application/Contacts/Groups/Groups.cs:97-107`
  - `backend/src/Popkin.Application/Contacts/Today/Today.cs:104-157, 175`
- **Problem**:
  1. **N+1 ownership validation in `GroupRules.ContactsAsync`** (`Groups.cs:97-107`):
     ```csharp
     public static async Task<IReadOnlyList<Guid>> ContactsAsync(
         IContactGuard guard, IReadOnlyList<Guid>? contactIds, CancellationToken cancellationToken)
     {
         var ids = (contactIds ?? []).Distinct().ToList();
         foreach (var id in ids)
         {
             await guard.RequireOwnedAsync(id, cancellationToken);
         }

         return ids;
     }
     ```
     Creating a group or adding $N$ people executes $N$ sequential `SELECT` round-trips instead of a single `WHERE OwnerId == owner && ids.Contains(Id)` count query.
  2. **Missing `.AsNoTracking()` in `GetTodayQueryHandler`** (`Today.cs:105, 113, 138, 145, 152`):
     None of the read queries in `GetTodayQueryHandler` use `.AsNoTracking()`, tracking all `Contact`, `KeyDate`, `FollowUp`, `Habit`, `HabitKept`, and `TimelineEntry` entities on a read-only `GET /api/contacts/today` request.
  3. **Full-history conversation note scan in `GetTodayQueryHandler`** (`Today.cs:121-127`):
     `GetTodayQueryHandler` pulls every conversation `TimelineEntry` (including its 2,000-character `Note` column) ever logged by the owner into memory just to find each contact's latest `Day` and the `Note` of the single `next` spotlight contact.
  4. **Locale-dependent sorting in `Today.cs:175`**:
     `Drifting` sorts ties with `StringComparer.CurrentCultureIgnoreCase`, whereas `GetPeople.cs:50` and `Groups.cs:145` use `StringComparer.OrdinalIgnoreCase`.
- **Recommendation**:
  Replace the `foreach` loop in `GroupRules.ContactsAsync` with a single set query; add `.AsNoTracking()` to all queries in `GetTodayQueryHandler`; project only `(ContactId, Max(Day))` for conversation dates and fetch the latest `Note` only for `next.ContactId`; and use `StringComparer.OrdinalIgnoreCase` in `Today.cs:175`.

---

### `CQ-09` (Medium) — Two Sequential DB Queries on Every Authenticated Request in `ValidateSessionQueryHandler`

- **Location**: `backend/src/Popkin.Application/Auth/Sessions.cs:12-24`
- **Problem**:
  `SessionCookieEvents.ValidatePrincipal` runs on every authenticated HTTP request and hub handshake, sending `ValidateSessionQuery`. `ValidateSessionQueryHandler` executes two separate database round-trips:
  ```csharp
  var session = await db.Sessions.AsNoTracking().FirstOrDefaultAsync(s => s.Id == request.SessionId, cancellationToken);
  if (session is null || session.PersonId != request.PersonId || !session.IsLive(clock.GetUtcNow()))
  {
      return false;
  }

  return await db.People.AnyAsync(p => p.Id == request.PersonId && p.DeletedAt == null, cancellationToken);
  ```
- **Recommendation**:
  Combine into a single query (or checks in one query projection) so every authenticated HTTP request performs at most one DB round-trip for session validation.

---

### `CQ-10` (Medium) — `Admin.NameFrom(string email)` Can Exceed `Person.MaxNameLength` (40 Characters)

- **Location**: `backend/src/Popkin.Domain/Admin.cs:42-50, 87-92`
- **Problem**:
  ```csharp
  private static string NameFrom(string email)
  {
      var local = email.Split('@')[0];
      var words = local.Split(['.', '_', '-'], StringSplitOptions.RemoveEmptyEntries);
      return words.Length == 0 ? local : string.Join(' ', words.Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
  }
  ```
  An email address can be up to 254 characters (`Contact.MaxEmailLength`, and RFC 5321 allows a 64-character local part), whereas `AdminConfiguration` configures `Admin.Name` with `HasMaxLength(Person.MaxNameLength)` (`40`). An admin email with a local part longer than 40 characters will pass email validation and fail on `SaveChangesAsync` with a database truncation error.
- **Recommendation**:
  Truncate the derived display name in `Admin.NameFrom` to `Person.MaxNameLength` (`40`).

---

### `CQ-11` (Medium) — `PlanHistory.Days(DateOnly today)` Off-by-One When `today < FirstDay` and $O(D \times C)$ Rescanning

- **Location**: `backend/src/Popkin.Domain/PlanHistory.cs:38-53, 73-106`
- **Problem**:
  ```csharp
  // backend/src/Popkin.Domain/PlanHistory.cs:45-53
  public IReadOnlyList<PlanDay> Days(DateOnly today)
  {
      var last = today < LastDay ? today : LastDay;
      var count = Math.Max(0, last.DayNumber - FirstDay.DayNumber) + 1;
      return Enumerable.Range(0, count)
          .Select(i => FirstDay.AddDays(i))
          .Select(day => new PlanDay(day, PointsLeftAtEndOf(day)))
          .ToList();
  }
  ```
  1. When `today < FirstDay`, `last.DayNumber - FirstDay.DayNumber` is negative, `Math.Max(0, ...)` clamps it to `0`, and `+ 1` produces `count = 1`, returning a `PlanDay` for a future date (`FirstDay`).
  2. `PointsLeftAtEndOf(DateOnly day)` scans `changes.Where(c => c.At < midnight).Sum(c => c.Delta)` on every call. `Days`, `Forecast`, and `Behind` invoke `PointsLeftAtEndOf` up to 58 times per burn-down calculation.
- **Recommendation**:
  Compute `var count = Math.Max(0, last.DayNumber - FirstDay.DayNumber + 1);` and precompute the 28 daily point totals in a single pass in `PlanHistory`'s constructor.

---

### `CQ-12` (Medium) — Inconsistent Error Code for Invalid Emoji Reaction (`reaction_invalid` vs `emoji_not_allowed`)

- **Locations**:
  - `backend/src/Popkin.Application/Chat/ReactionValidator.cs:20-22`
  - `backend/src/Popkin.Application/Photos/ReactToPhoto.cs:77-80`
- **Problem**:
  `ReactionValidator.Require(emoji)` throws `ProblemException.Invalid("reaction_invalid", "A reaction is one emoji.", "emoji")` for chat messages, whereas `PhotoReactions.RequireAsync` calls `ReactionValidator.IsEmoji(emoji)` directly and throws `ProblemException.Invalid("emoji_not_allowed", "A reaction is one emoji.", "emoji")` with the identical message and field name.
- **Recommendation**:
  Align on a single ProblemDetails `code` (or call `ReactionValidator.Require(emoji)` in both places if the specification permits).

---

### `CQ-13` (Low) — Unchecked Array Indexing in `ExperienceScore.Of` and `CountFor`

- **Location**: `backend/src/Popkin.Domain/ExperienceScore.cs:24-33`
- **Problem**:
  `ExperienceScore.Of` indexes `perStar[stars]` and `CountFor(int stars)` indexes `_counts[stars]` without checking `ExperienceRating.IsInRange(stars)` (`1..5`), throwing `IndexOutOfRangeException` instead of `ArgumentOutOfRangeException` if called with `0` or `> 5`.
- **Recommendation**:
  Guard both methods with `if (!ExperienceRating.IsInRange(stars)) throw new ArgumentOutOfRangeException(nameof(stars));`.

---

### `CQ-14` (Low) — Controller Form-Field Presence Logic and Export Formatting (`AGENTS.md` Rule)

- **Locations**:
  - `backend/src/Popkin.Api/Controllers/ExperiencesController.cs:66-78`
  - `backend/src/Popkin.Api/Controllers/Administration/AdminAuditController.cs:10, 22-28`
- **Problem**:
  `AGENTS.md` states: *"A controller, a hub method and a Worker job each check nothing themselves and send one MediatR request."*
  1. `ExperiencesController.Edit` manually reads `Request.ReadFormAsync(cancellationToken)` and inspects `form.ContainsKey(field)` to resolve fallback values before building `EditExperienceCommand`.
  2. `AdminAuditController` injects `TimeProvider clock` to compute the filename date (`popkin-audit-{day}.csv`) and UTF-8 byte array in the controller.
- **Recommendation**:
  Have `ExportAuditLogCommand` return an `AuditExportDto(byte[] Content, string FileName)` using `TimeProvider` in the handler.

---

### `CQ-15` (Low) — Frontend `AGENTS.md` Compliance Gaps (Template Utilities, Parity Specs, Page Helpers)

- **Locations**:
  - `frontend/projects/popkin/src/app/dialogs/delete-account/delete-account.dialog.html:10-13`
  - `e2e/tests/parity/`
  - `frontend/projects/popkin/src/app/pages/conversations/conversation-list.ts` and `message-actions.ts`
- **Problem**:
  1. **Forbidden CSS class and raw presentation HTML in `delete-account.dialog.html`**:
     Lines 10–13 use `<ul class="stack stack--sm text-sm"><li><strong>...</strong></li></ul>`. Per `AGENTS.md`, application templates may only use the utility classes `stack`, `cluster`, `split`, `form-grid`, `container`, `visually-hidden`, `truncate`, `text-muted`, `text-sm`, `text-caption`, `only-*` (not `stack--sm`) and must compose `pk-*` components rather than raw presentation lists.
  2. **7 active components missing parity specs in `e2e/tests/parity/` (ADR 0008 / ADR 0025)**:
     The following 7 components are actively used in `projects/popkin` or `projects/components` (not unbuilt admin screens) but have no spec in `e2e/tests/parity/`:
     - `pk-closest` (`frontend/projects/components/src/lib/closest/closest.ts` — used in `contacts-today.page.html`)
     - `pk-app-screen` (`frontend/projects/components/src/lib/app-screen/app-screen.ts` — used in 19 pages)
     - `pk-schedule` (`frontend/projects/components/src/lib/schedule/schedule.ts` — used in `this-week.page.html` and `time-off.page.html`)
     - `pk-status` (`frontend/projects/components/src/lib/status/status.ts` — used in `admin-shell` and `popkin`)
     - `pk-link-key` (`frontend/projects/components/src/lib/link-key/link-key.ts` — used in `connection-map.html`, though `connection-map.spec.ts` exists)
     - `pk-files-input` (`frontend/projects/components/src/lib/files-input/files-input.ts`)
     - `pk-qr` (`frontend/projects/components/src/lib/qr/qr.ts` — noted in Known Gap 56)
  3. **Shared logic in `pages/conversations/` instead of `projects/api` (ADR 0011)**:
     `conversation-list.ts` and `message-actions.ts` live under `frontend/projects/popkin/src/app/pages/conversations/` and are shared across `conversations.page.ts`, `group-chat.page.ts`, and `direct-message.page.ts` without unit tests in `projects/api`.
- **Recommendation**:
  Replace raw `<ul class="stack stack--sm text-sm">` in `delete-account.dialog.html` with a `pk-*` component; add parity specs for `closest`, `schedule`, `status`, `link-key`, and `app-screen` (or record exemptions in ADR 0008); and move pure helpers from `pages/conversations/` into `projects/api/src/lib/api/chat/`.
- **Resolution**:
  Resolved 17 November 2026: 1. the app templates set spacing with `pk-stack` and `pk-cluster`, New habit's label is `pk-field-label` and Delete your account's list is `pk-term-list` (a3c5839d); 2. `closest`, `app-screen`, `schedule`, `link-key`, `files-input` and `qr` have parity specs, and `status` turned out unused and was removed (bbf28fdd, a85e2b2b); 3. `ConversationList` and `MessageActions` are in `api/chat/` with unit tests, opening their dialogs through `CHAT_DIALOGS` (b9b18e27). [ADR 0029](adr/0029-one-library-no-unused-components.md).

---

### `CQ-16` (Low) — Store Naming Inconsistencies, Model Type Drift, and Unordered `public-api.ts` Exports

- **Locations**:
  - `frontend/projects/api/src/public-api.ts:5-170`
  - `frontend/projects/api/src/lib/models/*.ts`
- **Problem**:
  1. **Inconsistent store filenames**: 30 stores use `-store.ts` (`account-store.ts`, `people-store.ts`, `thread-store.ts`), 7 use `.store.ts` (`session.store.ts`, `pending-verification.store.ts`, `admin-session.store.ts`, `audit-log.store.ts`, `admin-sign-in.store.ts`, `admins.store.ts`, `admin-features.store.ts`), and 2 use `-state.ts` (`join-invite-state.ts`, `action-dialog-state.ts`).
  2. **Type drift on `accent` and `colour`**:
     - `AvatarView.accent` (`models/invite.ts:6`) and `ImportPersonView.accent` (`models/import.ts:8`) are typed as `PopkinColour`, whereas 11 other view interfaces across `models/contacts.ts`, `models/connections.ts`, `models/groups.ts`, and `models/today.ts` weaken `accent` to `string`.
     - `ChosenPopkin.colour` (`models/admin.ts:117`) and `FeaturePopkinMatch.colour` (`models/admin.ts:141`) are typed as `string` instead of `PopkinColour`.
  3. **Disorganized barrel file (`public-api.ts`)**: Exports from the same domain (`auth`, `popkins`, `invites`, `admin`) are split across non-contiguous sections of `public-api.ts` in chronological order.
- **Recommendation**:
  Standardize all store filenames to `*-store.ts`, tighten `accent` and `colour` properties to `PopkinColour`, and group `public-api.ts` exports by domain.

---

## 2. Redundant, Duplicated, and Dead Code

### `RD-01` — Identical `LocalOutboxStorage` and `LocalContactsOutboxStorage` Classes

- **Locations**:
  - `frontend/projects/api/src/lib/api/chat/local-outbox-storage.ts:1-37`
  - `frontend/projects/api/src/lib/api/contacts/local-contacts-outbox-storage.ts:1-37`
  - `frontend/projects/api/src/lib/api/popkins/popkins-snapshot.ts:21-61`
- **Finding**:
  `LocalOutboxStorage` and `LocalContactsOutboxStorage` are character-for-character identical (37 lines each) except for the `KEY` string (`'popkin.outbox'` vs `'popkin.contacts-outbox'`) and the entry type parameter (`OutboxEntry` vs `ContactsOutboxEntry`). `LocalPopkinsSnapshot` also duplicates the same `private storage(): Storage | null` helper.
- **Recommendation**:
  Replace both classes with a single generic `LocalJsonArrayStorage<T>` (or shared `BrowserLocalStorage` helper) parameterized by the storage key.
- **Resolution**:
  Resolved 17 November 2026: both storages delegate to `JsonListStorage` ([PR 89](https://github.com/QuinntyneBrown/popkin/pull/89)), and both outboxes keep their state through `OutboxQueue` (7ea057ee).

---

### `RD-02` — Parallel Outbox State Machines (`MessageOutbox` vs `ContactsOutbox`)

- **Locations**:
  - `frontend/projects/api/src/lib/api/chat/message-outbox.ts:48-245`
  - `frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts:42-129`
- **Finding**:
  Both outboxes implement the same core persistence and recovery mechanics:
  - Loading persisted entries on startup and resetting any entry left in `'Sending'` back to `'Waiting'` (`message-outbox.ts:54-56`, `contacts-outbox.ts:49-53`).
  - Holding unuploaded `File` blobs in a `Map<string, File>` keyed by client ID (`message-outbox.ts:59`, `contacts-outbox.ts:54`).
  - Updating the signal and writing through to storage (`update` / `change` methods in `message-outbox.ts:224-240` and `contacts-outbox.ts:119-128`).
- **Recommendation**:
  Extract a shared base/helper for persistent client-side outbox state (`held` signal, `Sending -> Waiting` recovery, `change`/`update` persistence) while keeping per-thread vs single-queue pumping specialized.
- **Resolution**:
  Resolved 17 November 2026 (7ea057ee): `OutboxQueue` (`api/storage/outbox-queue.ts`) holds the entries, the Sending to Waiting recovery, the files and the write-through; `MessageOutbox` and `ContactsOutbox` keep only their sending rules. Their unit tests pass unchanged.

---

### `RD-03` — Duplicated Auth Guards and `401` Interceptors Between `popkin` and `admin`

- **Locations**:
  - `frontend/projects/popkin/src/app/guards/signed-in.guard.ts:9-15` vs `frontend/projects/admin/src/app/guards/admin-session.guard.ts:10-14`
  - `frontend/projects/popkin/src/app/guards/signed-out.guard.ts:9-13` vs `frontend/projects/admin/src/app/guards/signed-out-admin.guard.ts:6-10`
  - `frontend/projects/popkin/src/app/guards/unauthorized.interceptor.ts:12-33` vs `frontend/projects/admin/src/app/guards/admin-auth.interceptor.ts:12-26`
- **Finding**:
  The route guards and `401` interceptors in `projects/popkin` and `projects/admin` have identical control flow, differing only in which session store they inject (`SessionStore` vs `AdminSessionStore`), which sign-in URL prefix is exempt (`/api/auth/codes` vs `/api/admin/auth/`), and where `signedOutGuard` redirects (`/popkins` vs `/`).
- **Recommendation**:
  Provide reusable guard/interceptor factories in `frontend/projects/api` configured by each app's `app.config.ts` / `app.routes.ts`.
- **Resolution**:
  Resolved 17 November 2026 (e8140dd3): `signedInGuardOf`, `signedOutGuardOf` and `unauthorizedInterceptorOf` (`api/auth/session-guards.ts`), with unit tests; each app names its store, its exempt requests and its home.

---

### `RD-04` — Duplicated Delete Confirmation and Action-Sheet Dialogs in `projects/popkin`

- **Locations**:
  - Synchronous confirmation dialogs (100% identical TS logic and template structure):
    - `frontend/projects/popkin/src/app/dialogs/delete-message/delete-message.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/delete-comment/delete-comment.dialog.ts` & `.html`
  - Async delete/leave confirmation dialogs (5 near-identical components):
    - `frontend/projects/popkin/src/app/dialogs/delete-experience/delete-experience.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/delete-story/delete-story.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/delete-contact/delete-contact.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/delete-photo/delete-photo.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/leave-popkin/leave-popkin.dialog.ts` & `.html`
  - Action-sheet menu dialogs:
    - `frontend/projects/popkin/src/app/dialogs/photo-actions/photo-actions.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/experience-actions/experience-actions.dialog.ts` & `.html`
    - `frontend/projects/popkin/src/app/dialogs/contact-actions/contact-actions.dialog.ts` & `.html`
- **Finding**:
  1. `DeleteMessageDialog` and `DeleteCommentDialog` are identical apart from their heading, body sentence, and confirm button label.
  2. All five async delete/leave dialogs repeat `readonly busy = signal(false); readonly failed = signal(false);` and identical `<div pk-dialog>` + `<div pk-alert variant="danger">` + danger/secondary button templates. Meanwhile, the admin app already has `ActionDialogState` (`frontend/projects/api/src/lib/api/admin/dialogs/action-dialog-state.ts`) for dialog `busy`/`failed` state.
- **Recommendation**:
  Consolidate confirmation dialogs or share a reusable `ConfirmDialogState` helper in `projects/api` (handling `busy`, `failed`, and `DialogRef.disableClose`) across both `popkin` and `admin`.
- **Resolution**:
  Resolved 17 November 2026 (20453417): Delete this message and Delete this comment are one `ConfirmDeleteDialog`; the five async dialogs, sign out, Delete your account and admin's `ActionDialogState` share `ConfirmDialogState`. The action sheets are different menus and stay apart.

---

### `RD-05` — Duplicated Session Teardown Sequence Across `sign-out`, `delete-account`, and `unauthorized.interceptor`

- **Locations**:
  - `frontend/projects/popkin/src/app/dialogs/sign-out/sign-out.dialog.ts:56-64`
  - `frontend/projects/popkin/src/app/dialogs/delete-account/delete-account.dialog.ts:58-66`
  - `frontend/projects/popkin/src/app/guards/unauthorized.interceptor.ts:24-28`
- **Finding**:
  `SignOutDialog.finish()` and `DeleteAccountDialog.confirm()` contain the exact same 6-line teardown sequence (`realtime.stop()`, `sessions.clear()`, `snapshot.clear()`, `ref.close()`, `router.navigateByUrl(...)`, `scroller.scrollToPosition([0, 0])`), and `unauthorizedInterceptor` duplicates a partial version of it.
- **Recommendation**:
  Extract a single teardown method on `SessionStore` (or an `AuthSessionCleanup` service in `projects/api`).
- **Resolution**:
  Resolved 17 November 2026 (3ccccc54): `SessionTeardown.forget()` and `end(url)`.

---

### `RD-06` — 24 Unused Library Components in `frontend/projects/components` and 1 Unused `api` Helper

- **Locations**:
  - `frontend/projects/components/src/lib/` (24 component directories)
  - `frontend/projects/api/src/lib/api/admin/metrics/trend-chart.ts`
- **Finding**:
  Of the 259 components in `frontend/projects/components/src/lib/`, **46 are not referenced directly in any application template** (`popkin`, `admin`, `marketing`). Of those 46:
  - **22 are used internally as child components** inside other library components (`action-pair`, `admin-brand`, `avatar-stack`, `badge`, `biggest-rows`, `conversation-card`, `conversation-row`, `date-tile`, `env-tag`, `habit-row`, `link-key`, `mark`, `mark-picture`, `pill`, `polaroids`, `react-bar`, `sparkline`, `stage-button`, `stat`, `stat-pair`, `step-dots`, `switch`).
  - **24 are completely unused anywhere in the workspace** (built ahead of unimplemented Admin Console screens under [ADR 0025](adr/0025-library-components-ahead-of-their-screens.md)):
    1. `app-preview` (`frontend/projects/components/src/lib/app-preview/app-preview.ts`)
    2. `attention-list` (`frontend/projects/components/src/lib/attention-list/attention-list.ts`)
    3. `change-list` (`frontend/projects/components/src/lib/change-list/change-list.ts`)
    4. `evidence` (`frontend/projects/components/src/lib/evidence/evidence.ts`)
    5. `figure-tabs` (`frontend/projects/components/src/lib/figure-tabs/figure-tabs.ts`)
    6. `headline-figure` (`frontend/projects/components/src/lib/headline-figure/headline-figure.ts`)
    7. `health-summary` (`frontend/projects/components/src/lib/health-summary/health-summary.ts`)
    8. `history-item` (`frontend/projects/components/src/lib/history-item/history-item.ts`)
    9. `job-detail` (`frontend/projects/components/src/lib/job-detail/job-detail.ts`)
    10. `job-toggle` (`frontend/projects/components/src/lib/job-toggle/job-toggle.ts`)
    11. `key-values` (`frontend/projects/components/src/lib/key-values/key-values.ts`)
    12. `limit-row` (`frontend/projects/components/src/lib/limit-row/limit-row.ts`)
    13. `log-list` (`frontend/projects/components/src/lib/log-list/log-list.ts`)
    14. `record-list` (`frontend/projects/components/src/lib/record-list/record-list.ts`)
    15. `release-note` (`frontend/projects/components/src/lib/release-note/release-note.ts`)
    16. `report-detail` (`frontend/projects/components/src/lib/report-detail/report-detail.ts`)
    17. `report-item` (`frontend/projects/components/src/lib/report-item/report-item.ts`)
    18. `save-bar` (`frontend/projects/components/src/lib/save-bar/save-bar.ts`)
    19. `service-card` (`frontend/projects/components/src/lib/service-card/service-card.ts`)
    20. `settings-list` (`frontend/projects/components/src/lib/settings-list/settings-list.ts`)
    21. `tile` (`frontend/projects/components/src/lib/tile/tile.ts`)
    22. `tiles` (`frontend/projects/components/src/lib/tiles/tiles.ts`)
    23. `trend` (`frontend/projects/components/src/lib/trend/trend.ts`) — and its helper `trendChartOf` in `frontend/projects/api/src/lib/api/admin/metrics/trend-chart.ts`
    24. `uptime` (`frontend/projects/components/src/lib/uptime/uptime.ts`)
- **Recommendation**:
  Track these 24 components in `docs/component-backlog.md` until their corresponding Admin Console screens and parity specs are built, or prune any whose target admin screen is deferred.
- **Resolution**:
  Resolved 17 November 2026 (89727a8a, a85e2b2b): the 24 components and `trendChartOf` are removed, and so is `status`, which only `pk-status-note` matched. [ADR 0029](adr/0029-one-library-no-unused-components.md) builds a component with its first screen; their design-system pages stay and `docs/component-backlog.md` marks them "Not built: built with its screen".

---

### `RD-07` — Overlapping Component Primitives in `frontend/projects/components`

- **Locations**: `frontend/projects/components/src/lib/`
- **Finding**:
  1. **5 key-value / definition-list components**: `contact-facts` (`dl[pk-contact-facts]`), `facts` + `fact` (`ul[pk-facts]` / `li[pk-fact]`), `key-values` (`dl[pk-key-values]`), `settings-list` (`dl[pk-settings-list]`), and `stat-pair` (`dl[pk-stat-pair]`).
  2. **8 chip-row components**: `chip`, `choice-chips`, `drift-chips`, `filter-chips`, `group-chips`, `toggle-chips`, `week-chips`, and `who-chips` each wrap horizontal chip lists with slight variations in selection state or routing.
- **Recommendation**:
  Where the design system allows, compose domain chip bars from `pk-chip` / `pk-filter-chips` rather than introducing a new component directory per screen.
- **Resolution**:
  Resolved 17 November 2026 (e4aed7e1): the who chip, drawn by `pk-who-chips` and `pk-drift-chips` alike, is one `pk-who-chip`; the other chip rows are different ARIA patterns of `pk-chip` or another block (`weeks`), and the three key-value components are three blocks in the mocks, so they stay apart ([ADR 0029](adr/0029-one-library-no-unused-components.md)).

---

### `RD-08` — Duplicated Interfaces and Union Types Across `frontend/projects/api/src/lib/models/`

- **Locations**:
  - **Duplicate feature union**:
    - `frontend/projects/api/src/lib/models/admin.ts:108` (`export type Feature = 'Plan' | 'Schedules';`)
    - `frontend/projects/api/src/lib/models/home.ts:50` (`export type PopkinFeature = 'Plan' | 'Schedules';`)
  - **4 identical member summary interfaces + 3 inline copies**:
    - `frontend/projects/api/src/lib/models/chat.ts:56-60` (`MessageAuthorView`)
    - `frontend/projects/api/src/lib/models/chat.ts:130-134` (`MemberJoinedView`)
    - `frontend/projects/api/src/lib/models/experiences.ts:48-52` (`KeenMemberView`)
    - `frontend/projects/api/src/lib/models/plan.ts:19-23` (`StoryOwnerView`)
    - Inlined `{ membershipId: string; firstName: string; avatar: AvatarView }` in `experiences.ts:18`, `photos.ts:9`, and `photos.ts:53`.
  - **Near-identical upload progress unions**:
    - `frontend/projects/api/src/lib/models/contacts.ts:338-339` (`MemoryUploadEvent<T>`)
    - `frontend/projects/api/src/lib/models/photos.ts:61-62` (`PhotoUploadEvent`)
  - **Duplicated KeyDate field shapes (`reminder` vs `lead`)**:
    - `frontend/projects/api/src/lib/models/contacts.ts:43-52` (`KeyDateDraft`), `166-177` (`ContactKeyDateView`), `194-203` (`AddKeyDateRequest`)
  - **Duplicated Contact summary fields**:
    - `GroupMemberView` (`models/groups.ts:9-21`) duplicates all 8 fields of `MapPersonView` (`models/connections.ts:15-25`).
- **Recommendation**:
  Consolidate `Feature` and `PopkinFeature`; extract a single `MemberBriefView` interface; unify `UploadEvent<T>`; and share a base `ContactSummaryView` and `KeyDateFields` interface across `models/`.
- **Resolution**:
  Resolved 17 November 2026 (0f48f0ee): `PopkinFeature`, `MemberBriefView`, `UploadEvent<P, D>`, `ContactSummaryView` and `KeyDateFields`.

---

### `RD-09` — Duplicated Session Entities (`Session` vs `AdminSession`) and Cookie Plumbing (`SessionCookie` vs `AdminSessionCookie`)

- **Locations**:
  - `backend/src/Popkin.Domain/Session.cs:7-36` vs `backend/src/Popkin.Domain/AdminSession.cs:7-36`
  - `backend/src/Popkin.Api/Auth/SessionCookie.cs:11-101` vs `backend/src/Popkin.Api/Auth/AdminSessionCookie.cs:16-113`
- **Finding**:
  1. `Session` and `AdminSession` implement identical expiration and revocation state machines (`Id`, `CreatedAt`, `ExpiresAt`, `RevokedAt`, `IsLive(now)`, `Revoke(now)`).
  2. `SessionCookie` and `AdminSessionCookie` duplicate cookie security options (`HttpOnly = true`, `SecurePolicy = CookieSecurePolicy.Always`, `SameSite = SameSiteMode.Strict`, `Path = "/"`, `SlidingExpiration = false`, `TimeProvider` wiring), `SignInAsync` claims construction, `ValidatePrincipal` rejection/sign-out flow, and `HttpCurrentPerson` / `HttpCurrentAdmin` claim parsing.
- **Recommendation**:
  Extract a shared cookie configuration helper and principal claim reader in `Popkin.Api/Auth/`, and a base `SessionRecord` in `Popkin.Domain`.

---

### `RD-10` — Duplicated Verification Code Confirmation and Concurrency Handling (`ConfirmCode` vs `ConfirmAdminCode`)

- **Locations**:
  - `backend/src/Popkin.Application/Auth/ConfirmCode.cs:26-86`
  - `backend/src/Popkin.Application/Administration/Auth/ConfirmAdminCode.cs:23-97`
- **Finding**:
  `ConfirmCodeCommandHandler` and `ConfirmAdminCodeCommandHandler` duplicate the verification code state checks (`IsExpired` → `400 code_expired`, `IsConsumed` → `400 code_used`, `!hasher.Matches` → `code.RecordFailedAttempt()`, `code.Consume(now)`, and catching `DbUpdateConcurrencyException` → `400 code_used`).
- **Recommendation**:
  Move common verification code validation and `Consume`/`DbUpdateConcurrencyException` handling into `CodeIssuer` (or a `VerificationCodes` helper in `Popkin.Application/Auth/`).

---

### `RD-11` — Duplicated Reaction Entities and Grouping Queries (`Chat` vs `Photos`)

- **Locations**:
  - `backend/src/Popkin.Domain/MessageReaction.cs:7-32` vs `backend/src/Popkin.Domain/PhotoReaction.cs:7-29`
  - `backend/src/Popkin.Application/Chat/Reactions.cs:36-42` vs `backend/src/Popkin.Application/Photos/ReactToPhoto.cs:94-103`
- **Finding**:
  `MessageReaction` and `PhotoReaction` have identical properties (`MembershipId`, `Emoji`, `ReactedAt`), and `PhotoReaction` borrows `MessageReaction.MaxEmojiLength`. Both `Reactions.Summary` and `PhotoReactions.OfAsync` group by `Emoji` with `StringComparer.Ordinal`, order by `g.Min(r => r.ReactedAt)` then `g.Key` with `StringComparer.Ordinal`.
- **Recommendation**:
  Share reaction grouping/ordering logic via a generic helper over `(string Emoji, Guid MembershipId, DateTimeOffset ReactedAt)`.

---

### `RD-12` — Misplaced `PhotoUpload` Record and Repeated Controller Stream Boilerplate

- **Locations**:
  - `backend/src/Popkin.Application/Invites/JoinPopkin.cs` (declares `PhotoUpload`, imported via `using Popkin.Application.Invites;` in `AccountController.cs:5`, `ContactMemoriesController.cs:6`, `ContactsPeopleController.cs:9`, `ExperiencesController.cs:7`)
  - 7 controller actions across `AccountController`, `ContactMemoriesController`, `ContactsPeopleController`, and `ExperiencesController`
- **Finding**:
  `PhotoUpload` lives in `Popkin.Application.Invites` even though it is used across 4 unrelated subsystems, and 7 controller actions repeat:
  ```csharp
  await using var content = photo?.OpenReadStream();
  var upload = photo is null ? null : new PhotoUpload(content!, photo.Length);
  ```
- **Recommendation**:
  Move `PhotoUpload` to `Popkin.Application.Photos` (or `Abstractions`) and add a small `IFormFile?` helper in `Popkin.Api`.

---

### `RD-13` — Duplicated Domain Helpers and Contact Avatar Projections Across Handlers

- **Locations**:
  - **Ordered `Guid` pair**: `backend/src/Popkin.Domain/ChatThread.cs:59-62` (`OrderedPair`) vs `backend/src/Popkin.Domain/Connection.cs:71` (`Order`)
  - **Trim-to-null string helper**: `backend/src/Popkin.Domain/Contact.cs:129` (`Clean`), `FollowUp.cs:55` (`Trimmed`), `KeyDate.cs:80` (inline)
  - **Contact avatar projection**: Repeated inline in `GetPeople.cs:54-60`, `Today.cs:162-163, 171-172`, `KeyDateRules.cs:67-70`, `FollowUps.cs`, `Habits.cs`, `Groups.cs`, `Connections.cs`, and `GetContact.cs`:
    ```csharp
    PersonName.FirstName(contact.Name),
    PersonName.Initials(contact.Name),
    AvatarAccent.For(contact.Id),
    contact.PhotoKey is { } key ? photos.GetReadUrl(key) : null
    ```
- **Recommendation**:
  Add a single `ContactAvatar.Of(Contact contact, IPhotoStore photos)` helper (or methods on `Contact`) in `Popkin.Application/Contacts/` to eliminate repeated 4-field avatar projections across all 8 Contacts query handlers.

---

### `RD-14` — Unimplemented `AdminAction`, `AuditAction`, and `AuditTargetKind` Enum Values

- **Locations**:
  - `backend/src/Popkin.Domain/AdminAction.cs:4-27`
  - `backend/src/Popkin.Domain/AuditAction.cs:4-55`
  - `backend/src/Popkin.Domain/AdminPermissions.cs:17-29`
  - `backend/src/Popkin.Application/Administration/AuditActionLabels.cs`
- **Finding**:
  `AdminAction` declares 21 enum values, `AuditAction` declares 33, and `AuditTargetKind` declares 12, but only 3 admin actions (`InviteAdmin`, `ChangeAdminRole`, `RemoveAdmin` + `ChangeFeatureSwitch`) have backend handlers/controllers today. The remaining enum values (`SuspendPerson`, `StartDeletion`, `OpenModerationView`, `EndCall`, `RunJob`, `ChangeLimits`, etc.) exist only in permission tables and label maps ahead of their vertical slices.
- **Recommendation**:
  Note these pre-declared enum values alongside the 24 pre-built admin components (`RD-06`) so they do not drift when their admin slices are implemented.

---

### `RD-15` — Duplicated 300 ms Delayed-Loading Timer Boilerplate Across 20+ Frontend Stores

- **Locations**:
  - `frontend/projects/api/src/lib/api/account/account-store.ts:20-49`
  - `frontend/projects/api/src/lib/api/contacts/people-store.ts`, `today-store.ts`, `dates-store.ts`, `follow-ups-store.ts`, `habits-store.ts`, `groups-store.ts`, `connections-store.ts`, `contact-profile-store.ts`
  - `frontend/projects/api/src/lib/api/experiences/experiences-store.ts`, `experience-store.ts`
  - `frontend/projects/api/src/lib/api/photos/album-store.ts`, `photo-view-store.ts`
  - `frontend/projects/api/src/lib/api/plan/plan-board-store.ts`, `burn-down-store.ts`
  - `frontend/projects/api/src/lib/api/schedule/this-week-store.ts`, `time-off-store.ts`
  - `frontend/projects/api/src/lib/api/wrap-up/recap-store.ts`
- **Finding**:
  Over 20 stores copy-paste the exact same 300 ms delayed-loading state machine (`L2-056 AC1`):
  ```ts
  private slow?: ReturnType<typeof setTimeout>;
  readonly state = signal<'pending' | 'loading' | 'ready' | 'error'>('pending');

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.slow));
  }
  ```
  Followed by identical `setTimeout` setup and `clearTimeout(this.slow)` calls in `next` and `error` callbacks. Notably, Known Gap 24 (`docs/detailed-designs/README.md`) mentions that the designed `screenLoad()` helper in `Loading, failure and offline` was never built, which is why every store re-implements this timer by hand.
- **Recommendation**:
  Implement the `screenLoad()` helper (or a small `DelayedLoadState` utility in `frontend/projects/api/src/lib/api/`) to replace the repeated `setTimeout` / `clearTimeout` / `DestroyRef` boilerplate across all stores.
- **Resolution**:
  Resolved 17 November 2026 (5ed52f6f): `DelayedLoading` (`api/loading/delayed-loading.ts`), with unit tests. By then only `AccountStore` still kept the timer by hand; it uses the helper.

---

### `RD-16` — Fragmented Date, Pluralization, and Error Copy Helpers Across 33 `*-text.ts` Files

- **Locations**:
  - 33 `*-text.ts` files across `frontend/projects/api/src/lib/api/**` (including 14 separate `*-text.ts` files in `src/lib/api/contacts/` alone: `contact-dates-text.ts`, `contact-form-text.ts`, `contact-profile-text.ts`, `contacts-text.ts`, `delete-contact-text.ts`, `follow-ups-text.ts`, `groups-text.ts`, `habits-text.ts`, `import-contacts-text.ts`, `log-entry-text.ts`, `memory-text.ts`, `people-text.ts`, `today-text.ts`, `connections-text.ts`).
- **Finding**:
  Short month names (`['Jan', 'Feb', ...]`), weekday names (`['Sun', 'Mon', ...]`), `"today"` / `"tomorrow"` / `"in {n} days"` / `"{n} days ago"` formatting, and singular/plural count formatting are re-implemented across multiple `*-text.ts` files in `contacts/`, `schedule/`, `photos/`, `chat/`, and `popkins/`.
- **Recommendation**:
  Extract shared calendar/relative-day formatting primitives in `frontend/projects/api/src/lib/api/` while keeping screen-specific copy functions in their respective domain modules.
- **Resolution**:
  Resolved 17 November 2026 (279302c8): `api/text/` holds the calendar names, `counted`/`plural` and `daysAway`; the 21 files that kept their own names read them from there, and the retry message of a ProblemDetails refusal, the counts and the relative days use the helpers.

