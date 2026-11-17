import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BIRTHDAYS_SHOWN,
  BirthdayReminderView,
  FREQUENCY_CHOICES,
  NotificationFrequency,
  NotificationGroupView,
  NotificationKind,
  NotificationSettingsStore,
  UNSUBSCRIBED_TEXT,
  DEVICE_REFUSED,
  OFF_BY_POPKIN,
  LEVEL_CHOICES,
  PopkinColour,
  PopkinLevelView,
  PopkinNotificationLevel,
  ReminderLead,
  accentOf,
  birthdayLeads,
  birthdayLine,
  parseNotificationLink,
  popkinLine,
} from 'api';
import {
  Avatar,
  Button,
  ChoiceCard,
  EmptyState,
  Icon,
  Link,
  NotifGroup,
  NotifMatrix,
  NotifRow,
  NotifSwitch,
  PageHead,
  PickList,
  PickListOption,
  Popover,
  PopkinTile,
  SearchField,
  Screen,
  SelectField,
  SegmentedControl,
  SettingList,
  SettingListEmpty,
  SettingListItem,
  SettingListMore,
  SettingsSection,
  Skeleton,
  Stack,
  Switch,
  TopBar,
  UndoBar,
  ViewNav,
} from 'components';

/**
 * "Notifications" (L2-155): whether activity email comes and how often, and each kind of
 * notification by email and by phone.
 */
@Component({
  selector: 'pk-notifications-page',
  imports: [
    Avatar,
    Button,
    ChoiceCard,
    EmptyState,
    Icon,
    Link,
    NotifGroup,
    NotifMatrix,
    PageHead,
    PickList,
    Popover,
    PopkinTile,
    RouterLink,
    Screen,
    SearchField,
    SegmentedControl,
    SelectField,
    SettingList,
    SettingListEmpty,
    SettingListItem,
    SettingListMore,
    SettingsSection,
    Skeleton,
    Stack,
    Switch,
    TopBar,
    UndoBar,
    ViewNav,
  ],
  providers: [NotificationSettingsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.page.html',
})
export class NotificationsPage implements OnInit {
  protected readonly store = inject(NotificationSettingsStore);
  protected readonly frequencies = FREQUENCY_CHOICES;
  protected readonly unsubscribedText = UNSUBSCRIBED_TEXT;
  protected readonly email = computed(() => this.store.settings()?.email);
  protected readonly groups = computed(() => this.store.settings()?.groups ?? []);
  protected readonly popkins = computed(() => this.store.settings()?.popkins ?? []);
  protected readonly levels = LEVEL_CHOICES.map((c) => ({ value: c.value, label: c.label }));

  /** The view, from `?tab=`: "types" (what you hear about) or "popkins" (L2-155 AC1). */
  readonly tab = input<string>();
  protected readonly views = computed(() => [
    {
      label: 'What you hear about',
      link: '/account/notifications',
      current: this.tab() !== 'popkins',
    },
    {
      label: 'Popkins',
      link: '/account/notifications',
      query: { tab: 'popkins' },
      current: this.tab() === 'popkins',
    },
    {
      label: 'People',
      link: '/account/notifications',
      query: { tab: 'people' },
      current: this.tab() === 'people',
    },
  ]);
  protected readonly muted = computed(() => this.store.settings()?.muted ?? []);
  protected readonly birthdays = computed(() => this.store.settings()?.birthdays ?? []);
  /** The first five, or every one once "Show all" is chosen (L2-159 AC2). */
  private readonly allBirthdays = signal(false);
  protected readonly shownBirthdays = computed(() =>
    this.allBirthdays() ? this.birthdays() : this.birthdays().slice(0, BIRTHDAYS_SHOWN),
  );
  private readonly injector = inject(Injector);
  /** Whether the "Mute someone" picker is open. */
  protected readonly picking = signal(false);
  private readonly popover = viewChild(Popover);
  protected readonly candidates = computed<PickListOption[]>(() =>
    this.store.candidates().map((person) => ({
      id: person.membershipId,
      name: person.name,
      accent: accentOf(person.avatar.accent),
      person: {
        initials: person.avatar.initials,
        photo: person.avatar.photoUrl,
        meta: person.sharedPopkins.join(', '),
      },
    })),
  );

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /**
   * A footer link's intent (L2-168 AC1): the mute it asks for is applied once the settings
   * arrive, and dropped from the address so a reload does not apply it again.
   */
  ngOnInit(): void {
    const intent = parseNotificationLink(this.route.snapshot.queryParamMap);
    this.store.open(intent);
    if (intent.mute) {
      void this.router.navigate([], { queryParams: { tab: intent.tab }, replaceUrl: true });
    }
  }

  protected switched(change: NotifSwitch): void {
    this.store.setKind(change.key as NotificationKind, change.channel, change.on);
  }

  protected chooseLevel(popkinId: string, level: string): void {
    this.store.setLevel(popkinId, level as PopkinNotificationLevel);
  }

  /** Opening the picker lists the first people before anything is typed. */
  protected pick(open: boolean): void {
    this.picking.set(open);
    if (open) this.store.searchMuteCandidates('');
  }

  protected mute(membershipId: string | null): void {
    if (!membershipId) return;
    this.store.mute(membershipId);
    this.popover()?.close();
  }

  /** "Show all" lists the rest and moves focus to the first row it adds (L2-159 AC2). */
  protected showAllBirthdays(): void {
    const next = this.birthdays()[BIRTHDAYS_SHOWN];
    this.allBirthdays.set(true);
    if (!next) return;
    afterNextRender(() => document.getElementById(`lead-${next.keyDateId}`)?.focus(), {
      injector: this.injector,
    });
  }

  protected birthdayLine(birthday: BirthdayReminderView): string {
    return birthdayLine(birthday);
  }

  protected leadsFor(birthday: BirthdayReminderView): readonly { value: string; label: string }[] {
    return birthdayLeads(birthday.lead);
  }

  protected chooseLead(keyDateId: string, lead: string): void {
    this.store.setBirthdayReminder(keyDateId, { lead: lead as ReminderLead });
  }

  /** "in Lakeside Weekend, Thursday Night Group" (L2-160 AC1). */
  protected shared(popkins: string[]): string {
    return popkins.length ? `in ${popkins.join(', ')}` : 'No Popkins in common now';
  }

  protected line(popkin: PopkinLevelView): string {
    return popkinLine(popkin);
  }

  protected accent(colour: PopkinColour): string {
    return accentOf(colour);
  }

  protected chooseFrequency(value: string): void {
    this.store.setFrequency(value as NotificationFrequency);
  }

  protected rows(group: NotificationGroupView): NotifRow[] {
    const emailBlocked = this.store.emailBlocked();
    const refused = this.store.refusedOnThisDevice();
    return group.kinds.map((kind) => ({
      key: kind.kind,
      name: kind.name,
      about: kind.about,
      email: kind.email,
      phone: kind.phone,
      required: kind.required,
      emailDisabled: emailBlocked || kind.offForEveryone,
      phoneDisabled: kind.offForEveryone,
      note: kind.offForEveryone
        ? OFF_BY_POPKIN
        : kind.phone && refused.has(kind.kind)
          ? DEVICE_REFUSED
          : undefined,
    }));
  }
}
