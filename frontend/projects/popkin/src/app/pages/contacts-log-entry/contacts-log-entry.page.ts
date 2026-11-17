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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  ContactProfileStore,
  LogEntryStore,
  LogKind,
  MEMORY_PHOTO_TYPES,
  MILESTONE_KINDS,
  NOT_FOUND_TEXT,
  PromiseDraft,
  TALK_CHANNELS,
  TalkChannel,
  MilestoneKind,
  logHeading,
  loggedAtLabel,
  promiseWhen,
  dialogConfig,
} from 'api';
import {
  Alert,
  Button,
  Chip,
  ChoiceChips,
  EmptyState,
  FormPair,
  FormSummary,
  Icon,
  IconName,
  KindGrid,
  KindOption,
  Link,
  LogForm,
  LogSection,
  LogWhen,
  MemoryChooser,
  ContactPromise,
  Screen,
  SegmentedControl,
  SettingRow,
  TextField,
  Textarea,
  TopBar,
} from 'components';
import { AddDateData, AddDateDialog } from '../../dialogs/add-date/add-date.dialog';
import { AddPromiseDialog } from '../../dialogs/add-promise/add-promise.dialog';

const CHANNEL_ICONS: Record<TalkChannel, IconName> = {
  InPerson: 'users',
  Phone: 'call',
  Video: 'video',
  Messages: 'message-square',
};

const KIND_ICONS: Record<MilestoneKind, KindOption['icon']> = {
  NewJob: 'briefcase',
  Wedding: 'heart',
  NewBaby: 'baby',
  Moved: 'house',
  Graduated: 'graduation-cap',
  SomethingElse: 'sparkle',
};

/**
 * Log a conversation or milestone (L2-133, L2-134): what passed with a contact, kept on their
 * timeline; a promise goes on Follow-ups and a yearly milestone on Dates. Once saved the profile
 * opens with it at the top (L2-133 AC5).
 */
@Component({
  selector: 'pk-contacts-log-entry-page',
  imports: [
    Alert,
    Button,
    Chip,
    ChoiceChips,
    EmptyState,
    FormPair,
    FormSummary,
    Icon,
    KindGrid,
    Link,
    LogForm,
    LogSection,
    LogWhen,
    MemoryChooser,
    ContactPromise,
    ReactiveFormsModule,
    RouterLink,
    Screen,
    SegmentedControl,
    SettingRow,
    TextField,
    Textarea,
    TopBar,
  ],
  providers: [ContactProfileStore, LogEntryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-log-entry.page.html',
})
export class ContactsLogEntryPage {
  /** From `/contacts/people/:contactId/log`. */
  readonly contactId = input.required<string>();
  /** `?kind=milestone` opens it on Milestone. */
  readonly kind = input<string>();
  protected readonly contact = inject(ContactProfileStore);
  protected readonly store = inject(LogEntryStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  protected readonly what = [
    { value: 'conversation', label: 'Conversation' },
    { value: 'milestone', label: 'Milestone' },
  ];
  protected readonly channels = TALK_CHANNELS.map((c) => ({ ...c, icon: CHANNEL_ICONS[c.value] }));
  protected readonly kinds = MILESTONE_KINDS.map((k) => ({ ...k, icon: KIND_ICONS[k.value] }));

  protected readonly firstName = computed(() => this.contact.profile()?.firstName ?? '');
  protected readonly heading = computed(() => logHeading(this.store.kind(), this.firstName()));
  protected readonly avatar = computed(() => {
    const profile = this.contact.profile();
    return profile
      ? {
          initials: profile.initials,
          accent: profile.accent.toLowerCase(),
          photoUrl: profile.photoUrl,
        }
      : undefined;
  });
  protected readonly profileLink = computed(() => `/contacts/people/${this.contactId()}`);
  protected readonly when = computed(() => loggedAtLabel(this.store.openedAt()));
  protected readonly saving = computed(() => this.store.state() === 'saving');
  protected readonly problems = computed(() =>
    this.store.problems().map(({ fieldId, message }) => ({ fieldId, message })),
  );
  protected readonly notFound = NOT_FOUND_TEXT;
  protected readonly promiseWhen = promiseWhen;
  protected readonly photoTypes = MEMORY_PHOTO_TYPES;
  protected readonly form = new FormGroup({
    note: new FormControl('', { nonNullable: true }),
    title: new FormControl('', { nonNullable: true }),
    happenedOn: new FormControl('', { nonNullable: true }),
    milestoneNote: new FormControl('', { nonNullable: true }),
  });

  constructor() {
    const fields = this.form.controls;
    fields.note.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.store.note.set(v));
    fields.title.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => this.store.title.set(v));
    fields.happenedOn.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.store.happenedOn.set(v));
    fields.milestoneNote.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => this.store.milestoneNote.set(v));
    effect(() => this.contact.open(this.contactId()));
    effect(() => {
      const firstName = this.firstName();
      const kind = this.kind() === 'milestone' ? 'milestone' : 'conversation';
      if (!firstName) return;
      untracked(() => {
        this.store.open(firstName, kind);
        this.form.controls.happenedOn.setValue(this.store.happenedOn(), { emitEvent: false });
      });
    });
  }

  protected error(fieldId: string): string | undefined {
    return this.store.problems().find((p) => p.fieldId === fieldId)?.error;
  }

  protected choose(kind: string): void {
    this.store.choose(kind as LogKind);
  }

  protected setChannel(channel: string): void {
    this.store.channel.set(channel as TalkChannel);
  }

  protected setMilestoneKind(kind: string): void {
    this.store.milestoneKind.set(kind as MilestoneKind);
  }

  /** "Add a promise or follow-up": the dialog Add a promise (known gap 106, ruled). */
  protected addPromise(): void {
    this.dialog
      .open<PromiseDraft, { firstName: string }>(
        AddPromiseDialog,
        dialogConfig({
          data: { firstName: this.firstName() },
        }),
      )
      .closed.subscribe((promise) => {
        if (promise) this.store.addPromise(promise);
      });
  }

  /** "Add a date" opens Add a date for this contact (L2-133 AC3). */
  protected addDate(): void {
    this.dialog.open<unknown, AddDateData>(
      AddDateDialog,
      dialogConfig({
        data: { contactId: this.contactId() },
      }),
    );
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.store.save(this.contactId())?.subscribe({
      next: () => void this.router.navigateByUrl(this.profileLink()),
      error: () => undefined,
    });
  }
}
