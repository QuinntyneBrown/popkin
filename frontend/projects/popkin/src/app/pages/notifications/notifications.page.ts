import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FREQUENCY_CHOICES,
  NotificationFrequency,
  NotificationGroupView,
  NotificationKind,
  NotificationSettingsStore,
  UNSUBSCRIBED_TEXT,
  DEVICE_REFUSED,
  LEVEL_CHOICES,
  PopkinColour,
  PopkinLevelView,
  PopkinNotificationLevel,
  accentOf,
  popkinLine,
} from 'api';
import {
  Button,
  ChoiceCard,
  EmptyState,
  Icon,
  NotifGroup,
  NotifMatrix,
  NotifRow,
  NotifSwitch,
  PageHead,
  PopkinTile,
  Screen,
  SegmentedControl,
  SettingList,
  SettingListItem,
  SettingsSection,
  Skeleton,
  Stack,
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
    Button,
    ChoiceCard,
    EmptyState,
    Icon,
    NotifGroup,
    NotifMatrix,
    PageHead,
    PopkinTile,
    RouterLink,
    Screen,
    SegmentedControl,
    SettingList,
    SettingListItem,
    SettingsSection,
    Skeleton,
    Stack,
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
  ]);

  ngOnInit(): void {
    this.store.open();
  }

  protected switched(change: NotifSwitch): void {
    this.store.setKind(change.key as NotificationKind, change.channel, change.on);
  }

  protected chooseLevel(popkinId: string, level: string): void {
    this.store.setLevel(popkinId, level as PopkinNotificationLevel);
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
      note: kind.phone && refused.has(kind.kind) ? DEVICE_REFUSED : undefined,
    }));
  }
}
