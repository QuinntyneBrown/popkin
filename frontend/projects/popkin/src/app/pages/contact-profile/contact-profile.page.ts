import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  connectionWords,
  AddedMemory,
  ContactMemoriesStore,
  ContactProfileStore,
  ContactTimelineStore,
  ContactsFrame,
  FollowUpsStore,
  NO_COUNTS,
  NOT_FOUND_TEXT,
  closestItem,
  habitFoot,
  habitDue,
  habitKeeping,
  habitRhythmLabel,
  habitTitle,
  HabitView,
  dueText,
  failedText,
  fileLine,
  kindIcon,
  leadLabel,
  loadingLine,
  noteLine,
  photoCaption,
  possessive,
  profileDateLine,
  profileDateTitle,
  profileSub,
  promiseNote,
  TimelineShow,
  timelineDay,
  timelineTag,
  timelineVia,
  dialogConfig,
} from 'api';
import {
  AddCard,
  AddField,
  AppScreen,
  AroundItem,
  Avatar,
  BackLink,
  Button,
  Cluster,
  ContactFact,
  ContactFacts,
  ContactId,
  ContactTimeline,
  ContactTimelineItem,
  ContactTimelineKind,
  ContactsGrid,
  ContactsPage,
  EmptyState,
  FilterChipOption,
  FilterChips,
  GroupChipItem,
  GroupChips,
  Icon,
  IconButton,
  InfoCard,
  KeepStrip,
  KeyDateItem,
  KeyDates,
  Likes,
  Link,
  ListHead,
  Memory,
  MemoryGrid,
  MemoryList,
  MemoryRow,
  PeopleAround,
  PopkinNav,
  Skeleton,
  Stack,
  TaskList,
  TaskListItem,
  ViewLink,
  ViewNav,
} from 'components';
import {
  ContactAction,
  ContactActionsData,
  ContactActionsDialog,
} from '../../dialogs/contact-actions/contact-actions.dialog';
import {
  DeleteContactData,
  DeleteContactDialog,
} from '../../dialogs/delete-contact/delete-contact.dialog';
import { AddDateData, AddDateDialog } from '../../dialogs/add-date/add-date.dialog';
import { AddMemoryData, AddMemoryDialog } from '../../dialogs/add-memory/add-memory.dialog';
import { NewHabitData, NewHabitDialog } from '../../dialogs/new-habit/new-habit.dialog';

type HistoryView = 'timeline' | 'follow-ups' | 'memories';

/**
 * A contact's profile (L2-128): who they are, how to reach them, what I know about them and
 * their history, with "More for {first name}" (L2-131). A contact not mine, or an address that
 * cannot name one, shows only the way back to People (L2-122 AC2).
 */
@Component({
  selector: 'pk-contact-profile-page',
  imports: [
    AddCard,
    AddField,
    AppScreen,
    Avatar,
    BackLink,
    Button,
    Cluster,
    ContactFacts,
    ContactId,
    ContactTimeline,
    ContactTimelineItem,
    ContactsGrid,
    ContactsPage,
    EmptyState,
    FilterChips,
    GroupChips,
    Icon,
    IconButton,
    InfoCard,
    KeepStrip,
    KeyDates,
    Likes,
    Link,
    ListHead,
    MemoryGrid,
    MemoryList,
    PeopleAround,
    PopkinNav,
    RouterLink,
    Skeleton,
    Stack,
    TaskList,
    ViewNav,
  ],
  providers: [ContactProfileStore, ContactTimelineStore, ContactMemoriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-profile.page.html',
})
export class ContactProfilePage {
  /** From `/contacts/people/:contactId`. */
  readonly contactId = input.required<string>();
  /** The history tab, from `?view=` (the timeline when absent). */
  readonly view = input<string>();
  protected readonly store = inject(ContactProfileStore);
  protected readonly frame = inject(ContactsFrame);
  protected readonly followUpsStore = inject(FollowUpsStore);
  protected readonly timeline = inject(ContactTimelineStore);
  protected readonly memories = inject(ContactMemoriesStore);
  protected readonly shows: FilterChipOption[] = [
    { value: 'all', label: 'All' },
    { value: 'conversations', label: 'Conversations' },
    { value: 'milestones', label: 'Milestones' },
  ];
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);
  protected readonly notFound = NOT_FOUND_TEXT;

  /** The first name the opening screen passed, until the profile is read (known gap 111). */
  private readonly passedFirstName =
    (this.router.getCurrentNavigation()?.extras.state?.['firstName'] as string | undefined) ?? null;

  protected readonly profile = this.store.profile;
  protected readonly firstName = computed(
    () => this.profile()?.firstName ?? this.store.knownFirstName(),
  );
  protected readonly loading = computed(() => loadingLine(this.store.knownFirstName()));
  protected readonly failed = computed(() => failedText(this.store.knownFirstName()));
  protected readonly sub = computed(() => {
    const profile = this.profile();
    return profile ? profileSub(profile) : '';
  });
  protected readonly editLink = computed(() => `/contacts/people/${this.contactId()}/edit`);
  protected readonly logLink = computed(() => `/contacts/people/${this.contactId()}/log`);
  protected readonly facts = computed<ContactFact[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const facts: ContactFact[] = [];
    if (profile.phone) facts.push({ icon: 'call', label: 'Phone', value: profile.phone });
    if (profile.email) facts.push({ icon: 'mail', label: 'Email', value: profile.email });
    if (profile.city) facts.push({ icon: 'map-pin', label: 'City', value: profile.city });
    if (profile.howWeMet)
      facts.push({ icon: 'heart', label: 'How you met', value: profile.howWeMet });
    return facts;
  });
  /** Key dates, soonest first, the near ones with the days left (L2-128 AC4). */
  protected readonly keyDates = computed<KeyDateItem[]>(() => {
    const today = new Date();
    return (this.profile()?.keyDates ?? []).map((date) => ({
      icon: kindIcon(date.kind),
      title: profileDateTitle(date),
      when: profileDateLine(date, today),
      reminder: leadLabel(date.reminder),
    }));
  });
  /** This contact's open follow-ups, soonest first (known gap 115, ruled). */
  protected readonly followUps = computed<TaskListItem[]>(() => {
    const today = new Date();
    return this.followUpsStore.forContact(this.contactId()).map((f) => {
      const note = promiseNote(f, today);
      return {
        id: f.id,
        text: f.text,
        done: f.doneAt !== null,
        note: note ?? 'Follow-up',
        noteIcon: note ? 'handshake' : undefined,
        due: dueText(f.dueOn, today),
        late: f.dueOn !== null && dueText(f.dueOn, today)?.endsWith('late') === true,
      };
    });
  });
  /** The timeline, newest first (L2-135 AC1). */
  protected readonly timelineItems = computed(() => {
    const today = new Date();
    return this.timeline.entries().map((entry) => ({
      id: entry.id,
      kind: entry.kind.toLowerCase() as ContactTimelineKind,
      date: timelineDay(entry.day, today),
      title: entry.title ?? undefined,
      body: entry.note ?? undefined,
      via: timelineVia(entry),
      tag: timelineTag(entry),
      photo: entry.photoUrl ?? undefined,
    }));
  });
  /** The photos on Memories & files, newest first (L2-136 AC1). */
  protected readonly memoryPhotos = computed<Memory[]>(() => {
    const today = new Date();
    return this.memories.memories().photos.map((photo) => ({
      photo: photo.thumbnailUrl,
      alt: photo.caption ?? `A photo from ${timelineDay(photo.day, today)}`,
      caption: photoCaption(photo, today),
    }));
  });
  /** The files, then the notes (L2-136 AC1). */
  protected readonly memoryRows = computed<MemoryRow[]>(() => {
    const today = new Date();
    const { files, notes } = this.memories.memories();
    return [
      ...files.map((file): MemoryRow => ({
        kind: 'file',
        title: file.fileName,
        text: fileLine(file),
        href: file.downloadUrl,
      })),
      ...notes.map((note): MemoryRow => ({
        kind: 'note',
        title: note.text,
        text: noteLine(note.updatedOn, today),
      })),
    ];
  });
  protected readonly historyLabel = computed(() => `${possessive(this.firstName() ?? '')} history`);
  protected readonly current = computed<HistoryView>(() => {
    const view = this.view();
    return view === 'follow-ups' || view === 'memories' ? view : 'timeline';
  });
  protected readonly views = computed<ViewLink[]>(() => {
    const link = `/contacts/people/${this.contactId()}`;
    const current = this.current();
    return [
      { label: 'Timeline', link, current: current === 'timeline' },
      {
        label: 'Follow-ups',
        link,
        query: { view: 'follow-ups' },
        current: current === 'follow-ups',
        count: this.followUps().filter((f) => !f.done).length,
      },
      {
        label: 'Memories & files',
        link,
        query: { view: 'memories' },
        current: current === 'memories',
      },
    ];
  });

  constructor() {
    effect(() => this.store.open(this.contactId(), this.passedFirstName));
    // The timeline is read once the contact is found, so an address that names no one asks for nothing more.
    effect(() => {
      const found = this.foundId();
      if (found) untracked(() => this.timeline.open(found));
    });
    // Memories & files are read when their tab opens (L2-136 AC1).
    effect(() => {
      const found = this.foundId();
      if (found && this.current() === 'memories') untracked(() => this.memories.open(found));
    });
  }

  /** "Add" opens Add to {first name}'s memories; what it keeps is placed first (L2-136 AC2). */
  protected addMemory(): void {
    const profile = this.profile();
    if (!profile) return;
    this.dialog
      .open<AddedMemory, AddMemoryData>(
        AddMemoryDialog,
        dialogConfig({
          data: { contactId: profile.id, firstName: profile.firstName },
        }),
      )
      .closed.subscribe((added) => {
        if (!added) return;
        if (added.kind === 'photo') this.memories.added('photo', added.memory);
        else if (added.kind === 'file') this.memories.added('file', added.memory);
        else this.memories.added('note', added.memory);
        if (added.kind === 'photo') this.timeline.open(profile.id);
      });
  }

  private readonly foundId = computed(() => this.store.profile()?.id);

  /** "All", "Conversations" or "Milestones" (L2-135 AC1). */
  protected show(show: string): void {
    this.timeline.choose(show as TimelineShow);
  }

  /** "Add a follow-up for {first name}" (L2-142 AC1). */
  protected addFollowUp(text: string): void {
    this.followUpsStore.add(text, this.contactId());
  }

  protected tick(change: { id: string; done: boolean }): void {
    const followUp = this.followUpsStore.followUps().find((f) => f.id === change.id);
    if (followUp) this.followUpsStore.setDone(followUp, change.done);
  }

  /** Our habit as its card shows it (L2-128 AC5). */
  /** "People around {first name}": each connection's other contact and its words (L2-150 AC4). */
  protected readonly around = computed<AroundItem[]>(() =>
    (this.store.profile()?.around ?? []).map((a) => ({
      name: a.name,
      initials: a.initials,
      photo: a.photoUrl,
      accent: a.accent.toLowerCase(),
      meta: connectionWords(a.words, a.kind),
      link: ['/contacts/people', a.contactId],
    })),
  );

  /** Their groups' chips, each opening that group (L2-146 AC4). */
  protected readonly groupChips = computed<GroupChipItem[]>(() =>
    (this.store.profile()?.groups ?? []).map((g) => ({
      emoji: g.emoji,
      name: g.name,
      link: ['/contacts/groups', g.id],
    })),
  );

  protected readonly habitCard = computed(() => {
    const habit = this.profile()?.habit;
    if (!habit) return null;
    const today = new Date();
    return {
      over: habitRhythmLabel(habit.rhythm),
      heading: habitTitle(habit.what, habit.contactFirstName),
      periods: habitKeeping(habit, today).periods,
      foot: habitFoot(habit.dueOn, today),
      late: habitDue(habit.dueOn, today).state === 'overdue',
    };
  });

  /** "Make a habit of seeing {first name}": New habit with them (L2-145). */
  protected newHabit(): void {
    const profile = this.profile();
    if (!profile) return;
    this.dialog
      .open<HabitView, NewHabitData>(
        NewHabitDialog,
        dialogConfig({
          data: {
            contact: {
              id: profile.id,
              name: profile.name,
              text: profile.knownAs ?? profile.circle ?? undefined,
              initials: profile.initials,
              accent: profile.accent.toLowerCase(),
              photoUrl: profile.photoUrl,
            },
          },
        }),
      )
      .closed.subscribe((started) => {
        if (started) this.store.habitStarted(started);
      });
  }

  /** Add a date for this contact; the profile reads again once it is kept (L2-138 AC4). */
  protected addDate(): void {
    this.dialog
      .open<unknown, AddDateData>(
        AddDateDialog,
        dialogConfig({
          data: { contactId: this.contactId() },
        }),
      )
      .closed.subscribe((saved) => {
        if (saved) this.store.retry();
      });
  }

  /** "Delete {first name}?" (L2-132): once they are gone, People opens. */
  private delete(): void {
    const profile = this.profile();
    if (!profile) return;
    this.dialog
      .open<boolean, DeleteContactData>(
        DeleteContactDialog,
        dialogConfig({
          data: {
            accent: 'coral',
            contactId: profile.id,
            firstName: profile.firstName,
            counts: {
              ...NO_COUNTS,
              ...profile.kept,
              followUps: this.followUpsStore.countFor(profile.id),
            },
          },
        }),
      )
      .closed.subscribe((deleted) => {
        if (deleted) void this.router.navigateByUrl('/contacts/people');
      });
  }

  /** "More for {first name}" (L2-131). */
  protected more(): void {
    const profile = this.profile();
    if (!profile) return;
    const opened = this.dialog.open<ContactAction, ContactActionsData>(
      ContactActionsDialog,
      dialogConfig({
        data: {
          accent: 'coral',
          name: profile.name,
          firstName: profile.firstName,
          closest: closestItem(profile),
        },
      }),
    );
    opened.closed.subscribe((action) => {
      if (action === 'closest') {
        if (profile.isClosest) this.store.takeOutOfClosest();
        else this.store.addToClosest();
      }
      if (action === 'edit') void this.router.navigateByUrl(this.editLink());
      if (action === 'delete') this.delete();
      if (action === 'connections')
        void this.router.navigate(['/contacts/connections'], {
          queryParams: { contact: profile.id },
        });
    });
  }
}
