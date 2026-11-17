import { Injectable, inject, signal } from '@angular/core';
import { FollowUpView } from '../../models/contacts';
import { TodayView } from '../../models/today';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { FOLLOW_UP_FAILED_HEADING, FOLLOW_UP_FAILED_TEXT } from './follow-ups-store';
import { ContactsPageState } from './people-store';

/**
 * Today (docs/detailed-designs/contacts/today): the device's day in one read (L2-125), the import
 * count with nobody in Contacts (L2-125 AC8), and a follow-up ticked done at once with "Undo",
 * put back if the write is refused (L2-142, L2-124 AC3). One per screen.
 */
@Injectable()
export class TodayStore {
  private readonly api = inject(CONTACTS_API);
  private readonly toaster = inject(Toaster);
  private day = new Date();

  readonly state = signal<ContactsPageState>('loading');
  readonly today = signal<TodayView | null>(null);
  /** "{n} people from your Popkins are ready to import"; 0 leaves the line out. */
  readonly readyToImport = signal(0);
  /** Follow-ups ticked on this screen: they stay, struck through, until the next read. */
  readonly done = signal<ReadonlySet<string>>(new Set());

  open(day: Date = new Date()): void {
    this.day = day;
    this.load();
  }

  /** With nobody in Contacts there is no day to read: only who is ready to import (L2-125 AC8). */
  openEmpty(): void {
    this.state.set('ready');
    this.readImportCount();
  }

  retry(): void {
    this.load();
  }

  /** "Mark done" or "Mark not done" (L2-142 AC2, AC3); done raises "Marked done" with Undo. */
  toggle(followUp: FollowUpView): void {
    const done = !this.done().has(followUp.id);
    this.mark(followUp.id, done);
    if (done) {
      this.toaster.show('success', 'Marked done', `${followUp.text}.`, {
        label: 'Undo',
        run: () => this.toggle(followUp),
      });
    }
    this.api.setFollowUpDone(followUp.id, done).subscribe({
      error: () => {
        this.mark(followUp.id, !done);
        this.toaster.show('danger', FOLLOW_UP_FAILED_HEADING, FOLLOW_UP_FAILED_TEXT);
      },
    });
  }

  private mark(id: string, done: boolean): void {
    this.done.update((ids) => {
      const next = new Set(ids);
      if (done) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private load(): void {
    if (this.state() !== 'ready') this.state.set('loading');
    this.api.today(dayParam(this.day)).subscribe({
      next: (today) => {
        this.today.set(today);
        this.done.set(new Set());
        this.state.set('ready');
        if (today.people === 0) this.readImportCount();
      },
      error: () => this.state.set('failed'),
    });
  }

  /** The count is a nicety: if it cannot be read, the line is left out. */
  private readImportCount(): void {
    this.api.importCandidates().subscribe({
      next: (candidates) => this.readyToImport.set(candidates.total),
      error: () => this.readyToImport.set(0),
    });
  }
}
