import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { TimelineItemView, TimelineShow } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';

/**
 * A profile's Timeline (L2-135 AC1, AC2): the contact's entries newest first, filtered by "All",
 * "Conversations" or "Milestones". Read each time the profile opens, so an entry Log just saved
 * is at the top (L2-133 AC5). Provided by the profile.
 */
@Injectable()
export class ContactTimelineStore {
  private readonly api = inject(CONTACTS_API);
  private reading?: Subscription;
  private contactId = '';

  readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  readonly show = signal<TimelineShow>('all');
  readonly entries = signal<TimelineItemView[]>([]);
  /** Nothing logged at all: the empty state, not an empty filter. */
  readonly empty = computed(
    () => this.state() === 'ready' && this.show() === 'all' && this.entries().length === 0,
  );

  open(contactId: string): void {
    this.contactId = contactId;
    this.read();
  }

  choose(show: TimelineShow): void {
    if (show === this.show()) return;
    this.show.set(show);
    this.read();
  }

  private read(): void {
    this.reading?.unsubscribe();
    this.reading = this.api.timeline(this.contactId, this.show()).subscribe({
      next: (timeline) => {
        this.entries.set(timeline.entries);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }
}
