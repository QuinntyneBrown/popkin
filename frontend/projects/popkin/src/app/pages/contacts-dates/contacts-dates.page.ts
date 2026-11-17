import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  ContactsFrame,
  DATES_FILTERS,
  DatesFilter,
  DatesStore,
  KeyDateRowView,
  REMINDER_LEADS,
  ReminderLead,
  SOON_DAYS,
  dateLine,
  dateTile,
  dateTitle,
  dateWhen,
  kindIcon,
  leadLabel,
  dialogConfig,
} from 'api';
import {
  AppScreen,
  Button,
  ContactsGrid,
  ContactsPage,
  DateList,
  DateListItem,
  EmptyState,
  FilterChipOption,
  FilterChips,
  PageHead,
  PopkinNav,
  ReminderDefault,
  ReminderDefaults,
  Section,
  Skeleton,
} from 'components';
import { AddDateData, AddDateDialog } from '../../dialogs/add-date/add-date.dialog';

type DefaultKey = 'birthdayLead' | 'anniversaryLead' | 'milestoneLead';

/**
 * Dates (L2-137, L2-139): the next occurrence of every key date, by month, narrowed by kind,
 * with my default lead times beside them. "Add a date" asks who it is for.
 */
@Component({
  selector: 'pk-contacts-dates-page',
  imports: [
    AppScreen,
    Button,
    ContactsGrid,
    ContactsPage,
    DateList,
    EmptyState,
    FilterChips,
    PageHead,
    PopkinNav,
    ReminderDefaults,
    Section,
    Skeleton,
  ],
  providers: [DatesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-dates.page.html',
})
export class ContactsDatesPage {
  protected readonly store = inject(DatesStore);
  protected readonly frame = inject(ContactsFrame);
  private readonly dialog = inject(Dialog);

  protected readonly filters: FilterChipOption[] = DATES_FILTERS.map((f) => ({ ...f }));
  protected readonly leads = REMINDER_LEADS.map((l) => ({ ...l }));
  protected readonly months = computed(() =>
    this.store.months().map((month) => ({ ...month, items: month.dates.map(itemOf) })),
  );
  protected readonly defaults = computed<ReminderDefault[]>(() => {
    const p = this.store.preferences();
    return [
      { key: 'birthdayLead', heading: 'Birthdays', value: p.birthdayLead },
      { key: 'anniversaryLead', heading: 'Anniversaries', value: p.anniversaryLead },
      { key: 'milestoneLead', heading: 'Milestones', value: p.milestoneLead },
    ];
  });

  constructor() {
    this.store.open();
  }

  protected show(filter: string): void {
    this.store.show(filter as DatesFilter);
  }

  protected changeDefault(change: { key: string; value: string }): void {
    this.store.changeDefault(change.key as DefaultKey, change.value as ReminderLead);
  }

  /** Add a date, for anyone of mine; Dates reads again once it is kept (L2-138 AC4). */
  protected addDate(): void {
    this.dialog
      .open<KeyDateRowView, AddDateData>(
        AddDateDialog,
        dialogConfig({
          data: { preferences: this.store.preferences() },
        }),
      )
      .closed.subscribe((saved) => {
        if (saved) this.store.retry();
      });
  }
}

function itemOf(date: KeyDateRowView): DateListItem {
  const tile = dateTile(date.occursOn);
  return {
    top: tile.top,
    day: tile.day,
    soon: date.daysLeft <= SOON_DAYS,
    avatars: [{ initials: date.initials, accent: date.accent.toLowerCase(), photo: date.photoUrl }],
    icon: kindIcon(date.kind),
    title: dateTitle(date),
    line: dateLine(date),
    when: dateWhen(date.daysLeft),
    reminder: leadLabel(date.lead),
    link: ['/contacts/people', date.contactId],
  };
}
