import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { NotificationSettingsView } from '../../models/notifications';
import { NOTIFICATIONS_API, NotificationsApi } from './notifications-api';
import { NotificationSettingsStore } from './notification-settings-store';

const settings: NotificationSettingsView = {
  email: { on: true, available: true, frequency: 'AsItHappens' },
  groups: [],
};

function storeWith(api: Partial<NotificationsApi>): NotificationSettingsStore {
  TestBed.configureTestingModule({
    providers: [NotificationSettingsStore, { provide: NOTIFICATIONS_API, useValue: api }],
  });
  return TestBed.inject(NotificationSettingsStore);
}

describe('NotificationSettingsStore', () => {
  it('reads the settings and is ready', () => {
    const store = storeWith({ settings: () => of(settings) });

    store.open();

    expect(store.state()).toBe('ready');
    expect(store.settings()).toEqual(settings);
  });

  it('is pending while the settings are on their way', () => {
    const answer = new Subject<NotificationSettingsView>();
    const store = storeWith({ settings: () => answer });

    store.open();

    expect(store.state()).toBe('pending');
    expect(store.settings()).toBeNull();
  });

  it('fails when the settings cannot be read, and reads them again on open', () => {
    let fail = true;
    const store = storeWith({
      settings: () => (fail ? throwError(() => new Error('down')) : of(settings)),
    });

    store.open();
    expect(store.state()).toBe('error');

    fail = false;
    store.open();
    expect(store.state()).toBe('ready');
  });
});
