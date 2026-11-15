import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ContactsFrame, SessionStore, greeting, longDay } from 'api';
import {
  AppScreen,
  Button,
  ContactsPage,
  ContactsStart,
  Icon,
  PageHead,
  PopkinNav,
} from 'components';

/**
 * Today (L2-125), the first Contacts page: the greeting and the device's day, and with nobody
 * in Contacts the way to start (L2-125 AC8).
 */
@Component({
  selector: 'pk-contacts-today-page',
  imports: [AppScreen, Button, ContactsPage, ContactsStart, Icon, PageHead, PopkinNav, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts-today.page.html',
})
export class ContactsTodayPage {
  protected readonly frame = inject(ContactsFrame);
  private readonly session = inject(SessionStore).session;
  private readonly now = new Date();

  protected readonly heading = computed(() => greeting(this.session()?.name ?? '', this.now));
  protected readonly day = longDay(this.now);
  protected readonly empty = computed(() => this.frame.people() === 0);

  constructor() {
    this.frame.refresh();
  }
}
