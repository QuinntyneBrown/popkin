import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FREQUENCY_CHOICES,
  NotificationFrequency,
  NotificationGroupView,
  NotificationKind,
  NotificationSettingsStore,
  UNSUBSCRIBED_TEXT,
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
  Screen,
  SettingsSection,
  Skeleton,
  Stack,
  TopBar,
  UndoBar,
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
    RouterLink,
    Screen,
    SettingsSection,
    Skeleton,
    Stack,
    TopBar,
    UndoBar,
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

  ngOnInit(): void {
    this.store.open();
  }

  protected switched(change: NotifSwitch): void {
    this.store.setKind(change.key as NotificationKind, change.channel, change.on);
  }

  protected chooseFrequency(value: string): void {
    this.store.setFrequency(value as NotificationFrequency);
  }

  protected rows(group: NotificationGroupView): NotifRow[] {
    const emailBlocked = this.store.emailBlocked();
    return group.kinds.map((kind) => ({
      key: kind.kind,
      name: kind.name,
      about: kind.about,
      email: kind.email,
      phone: kind.phone,
      required: kind.required,
      emailDisabled: emailBlocked || kind.offForEveryone,
      phoneDisabled: kind.offForEveryone,
    }));
  }
}
