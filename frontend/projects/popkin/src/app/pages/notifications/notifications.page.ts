import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FREQUENCY_CHOICES, NotificationGroupView, NotificationSettingsStore } from 'api';
import {
  Button,
  ChoiceCard,
  EmptyState,
  Icon,
  NotifGroup,
  NotifMatrix,
  NotifRow,
  PageHead,
  Screen,
  SettingsSection,
  Skeleton,
  Stack,
  TopBar,
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
  ],
  providers: [NotificationSettingsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './notifications.page.html',
})
export class NotificationsPage implements OnInit {
  protected readonly store = inject(NotificationSettingsStore);
  protected readonly frequencies = FREQUENCY_CHOICES;
  protected readonly email = computed(() => this.store.settings()?.email);
  protected readonly groups = computed(() => this.store.settings()?.groups ?? []);

  ngOnInit(): void {
    this.store.open();
  }

  protected rows(group: NotificationGroupView): NotifRow[] {
    return group.kinds.map((kind) => ({
      key: kind.kind,
      name: kind.name,
      about: kind.about,
      email: kind.email,
      phone: kind.phone,
      required: kind.required,
    }));
  }
}
