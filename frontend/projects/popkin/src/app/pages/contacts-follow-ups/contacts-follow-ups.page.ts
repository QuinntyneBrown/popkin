import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ContactsFrame,
  FollowUpView,
  FollowUpsFilter,
  FollowUpsStore,
  doneText,
  dueText,
  promiseNote,
  showDoneLabel,
} from 'api';
import {
  AddField,
  AppScreen,
  Button,
  ContactsGrid,
  ContactsPage,
  DateList,
  EmptyState,
  ListHead,
  PageHead,
  PopkinNav,
  SegmentedControl,
  SegmentedOption,
  Skeleton,
  TaskList,
  TaskListItem,
} from 'components';

/**
 * Follow-ups (L2-141, L2-142): what I said I would do, under "Overdue", "Today", "This week" and
 * "Later" on the device's day, added in a line and ticked off in place.
 */
@Component({
  selector: 'pk-contacts-follow-ups-page',
  imports: [
    AddField,
    AppScreen,
    Button,
    ContactsGrid,
    ContactsPage,
    DateList,
    EmptyState,
    ListHead,
    PageHead,
    PopkinNav,
    RouterLink,
    SegmentedControl,
    Skeleton,
    TaskList,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-follow-ups.page.html',
})
export class ContactsFollowUpsPage {
  protected readonly store = inject(FollowUpsStore);
  protected readonly frame = inject(ContactsFrame);
  protected readonly showDoneLabel = showDoneLabel;
  protected readonly tabs: SegmentedOption[] = [
    { value: 'everything', label: 'Everything' },
    { value: 'promises', label: 'Promises' },
  ];
  private readonly today = new Date();

  protected readonly buckets = computed(() =>
    this.store.buckets().map((bucket) => ({
      key: bucket.key,
      heading: bucket.heading,
      tasks: bucket.followUps.map((f) => this.openTask(f, bucket.key === 'overdue')),
    })),
  );
  protected readonly done = computed<TaskListItem[]>(() =>
    this.store.done().map((f) => ({
      id: f.id,
      text: f.text,
      done: true,
      due: f.doneAt ? doneText(f.doneAt) : undefined,
    })),
  );

  constructor() {
    this.store.filter.set('everything');
    this.store.showDone.set(false);
    this.store.open();
  }

  protected show(filter: string): void {
    this.store.filter.set(filter as FollowUpsFilter);
  }

  protected tick(change: { id: string; done: boolean }): void {
    const followUp = this.store.followUps().find((f) => f.id === change.id);
    if (followUp) this.store.setDone(followUp, change.done);
  }

  private openTask(f: FollowUpView, late: boolean): TaskListItem {
    const note = promiseNote(f, this.today);
    return {
      id: f.id,
      text: f.text,
      done: f.doneAt !== null,
      who: f.contactFirstName ?? undefined,
      whoLink: f.contactId ? ['/contacts/people', f.contactId] : undefined,
      whoPhoto: f.contactPhotoUrl,
      whoAccent: f.contactAccent?.toLowerCase(),
      note,
      noteIcon: note ? 'handshake' : undefined,
      due: dueText(f.dueOn, this.today),
      late,
    };
  }
}
