import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  CircleChoice,
  ContactRowView,
  ContactsFrame,
  ContactsOutbox,
  PeopleStore,
  drifting,
  lastTalked,
  nextDateLine,
  noResults,
  contactsPeopleLine,
} from 'api';
import {
  AppScreen,
  Button,
  ClosestPerson,
  Closest,
  ContactList,
  ContactRowItem,
  ContactsPage,
  EmptyState,
  FilterChipOption,
  FilterChips,
  ListHead,
  PageHead,
  PopkinNav,
  SearchField,
} from 'components';

/**
 * People (L2-126, L2-127): every contact, searched by name and narrowed to a circle on the
 * device, with Closest first. The count in the head is the Contacts summary's, so it shows
 * while the list loads and when it fails.
 */
@Component({
  selector: 'pk-contacts-people-page',
  imports: [
    AppScreen,
    Button,
    Closest,
    ContactList,
    ContactsPage,
    EmptyState,
    FilterChips,
    ListHead,
    PageHead,
    PopkinNav,
    RouterLink,
    SearchField,
  ],
  providers: [PeopleStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-people.page.html',
})
export class ContactsPeoplePage {
  protected readonly store = inject(PeopleStore);
  protected readonly frame = inject(ContactsFrame);

  /** Nobody in Contacts: by the summary while the list loads, then by the list (L2-126 AC4). */
  protected readonly empty = computed(
    () => this.store.empty() || (this.store.state() === 'loading' && this.frame.people() === 0),
  );
  protected readonly sub = computed(() => {
    if (this.empty()) return contactsPeopleLine(0);
    const people =
      this.store.state() === 'ready' ? this.store.contacts().length : this.frame.people();
    return people === null ? '' : contactsPeopleLine(people);
  });
  protected readonly circles = computed<FilterChipOption[]>(() =>
    this.store.counts().map(({ circle, count }) => ({ value: circle, label: circle, count })),
  );
  protected readonly closest = computed<ClosestPerson[]>(() =>
    this.store.closest().map((c) => ({
      firstName: c.firstName,
      photo: c.photoUrl,
      initials: c.initials,
      accent: c.accent.toLowerCase(),
      link: ['/contacts/people', c.id],
    })),
  );
  protected readonly rows = computed<ContactRowItem[]>(() => this.store.shown().map(rowOf));
  protected readonly noResults = computed(() => noResults(this.store.search()));

  protected choose(circle: string): void {
    this.store.circle.set(circle as CircleChoice);
  }

  constructor() {
    this.store.open();
    // Someone added offline is saved once back: People reads again (L2-123 AC4).
    inject(ContactsOutbox)
      .sent$.pipe(takeUntilDestroyed())
      .subscribe(() => this.store.retry());
  }
}

function rowOf(contact: ContactRowView): ContactRowItem {
  const next = contact.nextDate ? nextDateLine(contact.nextDate) : null;
  return {
    name: contact.name,
    relation: contact.knownAs ?? undefined,
    circle: contact.circle ?? undefined,
    next: next ? { date: next.date, what: next.what, near: next.near } : undefined,
    lastTalked: lastTalked(contact.lastTalkedOn, contact.lastTalkedDays),
    quiet: drifting(contact.lastTalkedDays),
    photo: contact.photoUrl,
    initials: contact.initials,
    accent: contact.accent.toLowerCase(),
    link: ['/contacts/people', contact.id],
  };
}
