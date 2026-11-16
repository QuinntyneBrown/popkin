import { Injectable, computed, inject, signal } from '@angular/core';
import { CONTACT_CIRCLES, ContactCircle, ContactRowView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { dayParam } from './contacts-text';
import { matchesName } from './people-text';

/** Where a Contacts page is in reading what it shows (L2-123 AC1 to AC3). */
export type ContactsPageState = 'loading' | 'ready' | 'failed';

export type CircleChoice = ContactCircle | 'All';

/**
 * People (docs/detailed-designs/contacts/people): the list read once, then searched and narrowed
 * to a circle on the device (L2-126, L2-127). One per screen; the page provides it.
 */
@Injectable()
export class PeopleStore {
  private readonly api = inject(CONTACTS_API);
  private day = new Date();

  readonly state = signal<ContactsPageState>('loading');
  readonly contacts = signal<ContactRowView[]>([]);
  /** What is typed in "Search by name"; kept while the list loads (L2-127 AC4). */
  readonly search = signal('');
  readonly circle = signal<CircleChoice>('All');

  /** "All 13", "Family 4"… (L2-127 AC1). */
  readonly counts = computed(() => {
    const contacts = this.contacts();
    return [
      { circle: 'All' as CircleChoice, count: contacts.length },
      ...CONTACT_CIRCLES.map((circle) => ({
        circle: circle as CircleChoice,
        count: contacts.filter((c) => c.circle === circle).length,
      })),
    ];
  });
  /** The rows left after the circle and the search. */
  readonly shown = computed(() => {
    const circle = this.circle();
    const search = this.search();
    return this.contacts().filter(
      (c) => (circle === 'All' || c.circle === circle) && matchesName(c.name, search),
    );
  });
  /** Closest, by first name, only with no search and no circle chosen (L2-126 AC2). */
  readonly closest = computed(() =>
    this.circle() === 'All' && this.search().trim() === ''
      ? this.contacts()
          .filter((c) => c.isClosest)
          .sort((a, b) => a.firstName.localeCompare(b.firstName))
      : [],
  );
  /** The list's name for assistive technology: "Everyone" or the circle (L2-127 AC2). */
  readonly listName = computed(() => (this.circle() === 'All' ? 'Everyone' : this.circle()));
  readonly empty = computed(() => this.state() === 'ready' && this.contacts().length === 0);
  readonly noResults = computed(
    () =>
      this.state() === 'ready' &&
      this.contacts().length > 0 &&
      this.search().trim() !== '' &&
      this.shown().length === 0,
  );

  /** Reads People for the device's day. */
  open(day: Date = new Date()): void {
    this.day = day;
    this.load();
  }

  /** "Try again" (L2-123 AC3). */
  retry(): void {
    this.load();
  }

  private load(): void {
    this.state.set('loading');
    this.api.people(dayParam(this.day)).subscribe({
      next: (people) => {
        this.contacts.set(people.contacts);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }
}
