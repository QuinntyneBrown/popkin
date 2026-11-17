# Code quality and redundancy audit — 17 November 2026

## Scope and method

Targeted, read-only review of hand-written .NET backend, Angular app and API library, and Playwright fixture code. I checked findings against `AGENTS.md`, L2 requirements, detailed designs and relevant ADRs. Generated EF migration snapshots and design-system output were excluded from duplication findings. This is a source audit, not an exhaustive file-by-file review or a runtime security test; no test suite was run and no production code was changed.

The priority is protecting the private, temporary spaces and conversations Popkin exists to provide. The first two findings affect personal data on a shared device and therefore deserve attention before routine refactoring.

## Findings

### 1. High — sign-out and account deletion leave private browser data behind

**Evidence.** [SignOutDialog](../../frontend/projects/popkin/src/app/dialogs/sign-out/sign-out.dialog.ts#L56), [DeleteAccountDialog](../../frontend/projects/popkin/src/app/dialogs/delete-account/delete-account.dialog.ts#L57), and the [401 interceptor](../../frontend/projects/popkin/src/app/guards/unauthorized.interceptor.ts#L22) clear the session and `PopkinsSnapshot` only. [Contacts outbox storage](../../frontend/projects/api/src/lib/api/contacts/local-contacts-outbox-storage.ts#L5) retains names and contact details in `localStorage`; [message outbox storage](../../frontend/projects/api/src/lib/api/chat/local-outbox-storage.ts#L5) retains unsent message text there; [DraftStore](../../frontend/projects/api/src/lib/api/chat/draft-store.ts#L4) retains draft text in `sessionStorage`. None exposes a clear operation used by those three exit paths. The sign-out and deletion code explicitly says that nothing of the person stays on the device, but the implementation does not fulfill that statement. This also conflicts with the private-data intent of [L2-054](../specs/L2.md#L776).

**Impact.** A later user of the same browser profile can inspect the previous person's contacts and text in browser storage. Account deletion also leaves local copies of data that the UI says was removed.

**Recommendation.** Give each personal store an explicit clear operation and invoke one shared personal-data cleanup on successful sign-out, account deletion, and session expiry. Include in-memory queue entries, file references and object URLs. Add behavioral coverage for those exit paths and a reload under a different account.

### 2. High — the Contacts offline queue is not bound to its owner

**Evidence.** [ContactsOutboxEntry](../../frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts#L12) has no owner identifier. Its storage uses one global key, `popkin.contacts-outbox`, and [loads every entry](../../frontend/projects/api/src/lib/api/contacts/local-contacts-outbox-storage.ts#L12). [App initialization](../../frontend/projects/popkin/src/app/app.config.ts#L80) creates the outbox, whose [constructor](../../frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts#L63) immediately calls `sendWaiting()` when the browser reports online. `sendWaiting()` [posts the saved request](../../frontend/projects/api/src/lib/api/contacts/contacts-outbox.ts#L86) without checking the active session or the identity that created it. The existing [outbox test](../../frontend/projects/api/src/lib/api/contacts/contacts-outbox.spec.ts#L93) proves replay after reload but does not cover a changed account.

**Impact.** If person A queues a contact while offline, then person B signs in on the same browser before connectivity returns, A's contact can be created in B's account. On an unauthenticated startup, the same request can receive 401 and be marked `Failed`, so it will not be retried after sign-in. Both outcomes violate the one-owner rule in the [Contacts architecture](../detailed-designs/README.md#L354).

**Recommendation.** Persist the owner with each queued write, load and send only entries for the confirmed session, and decide explicitly whether sign-out discards or quarantines pending writes. Start replay after session restoration. Test offline queue, account switch and unauthenticated reload through observable behavior.

### 3. Medium — address rate limits can double at a window boundary

**Evidence.** [L2-053 AC1 and AC3](../specs/L2.md#L760) say 10 code requests and 20 invite-code attempts **within 10 minutes**. Both address policies use [`FixedWindowRateLimiter`](../../backend/src/Popkin.Api/RateLimiting/RateLimitPolicyNames.cs#L66). That permits a full allowance just before a fixed-window reset and another just after it: 20 code requests or 40 invite attempts in much less than 10 minutes. The [abuse-limits design](../detailed-designs/security/abuse-limits/README.md#L70) explicitly chooses fixed windows, so this is a requirement/design/implementation mismatch, not an accidental framework default.

**Recommendation.** Align the design and implementation with the requirement's rolling interval, using the existing sliding-log limiter or another rolling-window policy. Prove boundary behavior through API acceptance tests, including `Retry-After`. If the product intends fixed windows, change L2-053 explicitly before treating the current behavior as correct.

### 4. Low — dropping a wrapped-up Popkin's messages skips resource cleanup

**Evidence.** [MessageOutbox.failed](../../frontend/projects/api/src/lib/api/chat/message-outbox.ts#L200) removes all entries for a wrapped-up Popkin after a 409. Normal send and discard paths call [`forget`](../../frontend/projects/api/src/lib/api/chat/message-outbox.ts#L195), which removes queued `File` objects and revokes photo preview object URLs; the wrapped-up path does not. The [existing test](../../frontend/projects/api/src/lib/api/chat/message-outbox.spec.ts#L314) checks only the visible queue.

**Impact.** Photo files and preview URLs remain held by the root outbox for the rest of the app session after its entries disappear.

**Recommendation.** Collect the removed entries, call `forget` for each, then update the queue. Extend the behavioral test with a photo preview and verify its resource is released.

## Redundant code worth consolidating

- **Browser storage adapters.** [LocalOutboxStorage](../../frontend/projects/api/src/lib/api/chat/local-outbox-storage.ts#L8) and [LocalContactsOutboxStorage](../../frontend/projects/api/src/lib/api/contacts/local-contacts-outbox-storage.ts#L8) have effectively identical parse, save and storage-access code. A small typed JSON storage helper would give both the same malformed-data behavior and one place to implement clearing. Keep their distinct keys and domain-facing interfaces.
  **Resolved 17 November 2026** ([PR 89](https://github.com/QuinntyneBrown/popkin/pull/89)). Both classes keep their keys, interfaces and providers and delegate to `JsonListStorage` (`frontend/projects/api/src/lib/api/storage/json-list-storage.ts`), unit-tested for missing, malformed and non-array data, the round trip, the empty list removing the key, and an absent, refused or full store. Each class has a spec pinning its key and stored format. Clearing (finding 1) is not part of this change; `JsonListStorage` is where it goes.
- **Dialog options.** The same `ariaLabelledBy`, `hasBackdrop: false`, `ariaModal: true` options are repeated throughout the app, including [contact profile](../../frontend/projects/popkin/src/app/pages/contact-profile/contact-profile.page.ts#L104) and [experience detail](../../frontend/projects/popkin/src/app/pages/experience-detail/experience-detail.page.ts#L213); `popkin-home.page.ts` repeats them for several dialogs. Centralize the standard CDK configuration only after checking that each dialog has the same accessibility and backdrop behavior. Keep dialog-specific overrides explicit.
  **Resolved 17 November 2026** ([PR 89](https://github.com/QuinntyneBrown/popkin/pull/89)). All 53 `dialog.open` calls in the app were listed; 51 now open through `dialogConfig` (`frontend/projects/api/src/lib/api/dialogs/dialog-config.ts`: `ariaLabelledBy: 'dlg-title'`, `hasBackdrop: false`, `ariaModal: true`), with each dialog's own data, description, title id, `autoFocus` and `restoreFocus` passed explicitly at the call. The page-local `MODAL` constants are gone; `DELETE_STORY` and `DELETE_COMMENT` keep only their own ids. Import from your Popkins (Today and People) differs, with the CDK backdrop and no `aria-modal`, and stays explicit as it shipped ([known gap 120](../detailed-designs/README.md#known-gaps)). The designed `DialogOpener` is not built ([known gap 121](../detailed-designs/README.md#known-gaps)).

## Existing documented gaps observed, not counted as new findings

The API currently has no forwarded-header handling or OpenTelemetry setup. [Deployment notes](../deployment.md#L6) already mark both as designed but not coded; [ADR 0012](../adr/0012-opentelemetry.md) records the telemetry decision. These gaps affect deployment readiness, but this audit does not reclassify them as newly discovered duplication or defects.
