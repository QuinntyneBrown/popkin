import { Injectable, computed, inject, signal } from '@angular/core';
import { AddFollowUpRequest, FollowUpView, FollowUpsFilter } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import {
  byDue,
  doneFollowUps,
  followUpBuckets,
  followUpsSubtitle,
  lateOrDueToday,
} from './follow-ups-text';

export const FOLLOW_UP_FAILED_HEADING = 'We couldn’t save that follow-up';
export const FOLLOW_UP_FAILED_TEXT = 'Check your connection and try again.';

/**
 * Follow-ups (docs/detailed-designs/contacts/follow-ups): every follow-up of mine, bucketed by the
 * device's day, and the count of those late or due today that the Contacts navigation badges
 * (L2-121 AC5). A tick or an add shows at once; a failed save is put back with the danger toast,
 * whose "Try again" sends the same write (L2-124 AC3). Shared by Follow-ups, a profile and the
 * navigation.
 */
@Injectable({ providedIn: 'root' })
export class FollowUpsStore {
  private readonly api = inject(CONTACTS_API);
  private readonly toaster = inject(Toaster);

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly followUps = signal<FollowUpView[]>([]);
  readonly filter = signal<FollowUpsFilter>('everything');
  readonly showDone = signal(false);
  /** Ticked since the list was read: they stay where they were, struck through. */
  private readonly ticked = signal<ReadonlySet<string>>(new Set());
  /** The device's day, read when the list is read. */
  private readonly today = signal(new Date());

  private readonly open$ = computed(() => this.followUps().filter((f) => f.doneAt === null));
  readonly openCount = computed(() => this.open$().length);
  readonly promiseCount = computed(() => this.open$().filter((f) => f.isPromise).length);
  readonly subtitle = computed(() => followUpsSubtitle(this.openCount(), this.promiseCount()));
  readonly buckets = computed(() =>
    followUpBuckets(this.followUps(), this.today(), this.filter(), this.ticked()),
  );
  readonly done = computed(() => doneFollowUps(this.followUps(), this.filter(), this.ticked()));
  /** The navigation's badge: open follow-ups due today or before. */
  readonly due = computed(() => lateOrDueToday(this.followUps(), this.today()));

  /** Reads every follow-up; the page shows loading until it answers. */
  open(): void {
    this.state.set('loading');
    this.ticked.set(new Set());
    this.read();
  }

  /** Reads again without showing loading, for the navigation's badge. */
  refresh(): void {
    this.read();
  }

  /** A contact's open follow-ups, soonest first, for their profile. */
  forContact(contactId: string): FollowUpView[] {
    return this.open$()
      .filter((f) => f.contactId === contactId)
      .sort(byDue);
  }

  /** "Add a follow-up": for nobody, or for the contact whose profile it is (L2-142 AC1). */
  add(text: string, contactId: string | null = null): void {
    const trimmed = text.trim();
    if (trimmed.length === 0) return;
    this.send({ clientId: crypto.randomUUID(), text: trimmed, contactId, dueOn: null });
  }

  /** "Mark done" or "Mark not done" (L2-142 AC2, AC3); done raises "Marked done" with Undo. */
  setDone(followUp: FollowUpView, done: boolean): void {
    const before = followUp.doneAt;
    if (followUp.doneAt === null) this.ticked.update((ids) => new Set([...ids, followUp.id]));
    this.replace(followUp.id, { doneAt: done ? new Date().toISOString() : null });
    if (done) {
      this.toaster.show('success', 'Marked done', `${followUp.text}.`, {
        label: 'Undo',
        run: () => this.setDone(followUp, false),
      });
    }
    this.api.setFollowUpDone(followUp.id, done).subscribe({
      next: (saved) => this.replace(followUp.id, saved),
      error: () => {
        this.replace(followUp.id, { doneAt: before });
        this.failed(() => this.setDone(followUp, done));
      },
    });
  }

  private read(): void {
    this.today.set(new Date());
    this.api.followUps().subscribe({
      next: (followUps) => {
        this.followUps.set(followUps);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }

  private send(request: AddFollowUpRequest): void {
    const shown: FollowUpView = {
      id: request.clientId,
      text: request.text,
      contactId: request.contactId ?? null,
      contactFirstName: null,
      contactInitials: null,
      contactAccent: null,
      contactPhotoUrl: null,
      dueOn: request.dueOn ?? null,
      isPromise: false,
      promisedVia: null,
      promisedOn: null,
      createdAt: new Date().toISOString(),
      doneAt: null,
    };
    this.followUps.update((list) => [...list, shown]);
    this.api.addFollowUp(request).subscribe({
      next: (saved) => this.replace(request.clientId, saved),
      error: () => {
        this.followUps.update((list) => list.filter((f) => f.id !== request.clientId));
        this.failed(() => this.send(request));
      },
    });
  }

  private replace(id: string, change: Partial<FollowUpView>): void {
    this.followUps.update((list) => list.map((f) => (f.id === id ? { ...f, ...change } : f)));
  }

  private failed(retry: () => void): void {
    this.toaster.show('danger', FOLLOW_UP_FAILED_HEADING, FOLLOW_UP_FAILED_TEXT, {
      label: 'Try again',
      run: retry,
    });
  }
}
