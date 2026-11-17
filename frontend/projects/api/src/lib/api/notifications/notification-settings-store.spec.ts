import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { NotificationSettingsView } from '../../models/notifications';
import { Toaster } from '../toasts/toaster';
import { NOTIFICATIONS_API, NotificationsApi } from './notifications-api';
import { NotificationSettingsStore, SAVE_FAILED } from './notification-settings-store';
import { PUSH_SUBSCRIBER, PushOutcome } from './push-subscriber';

const settings: NotificationSettingsView = {
  email: { on: true, available: true, frequency: 'AsItHappens' },
  groups: [
    {
      group: 'Activity',
      name: 'When something changes',
      about: 'Anything new in a Popkin you’re in.',
      kinds: [
        {
          kind: 'GroupChat',
          name: 'Group chat',
          about: 'New messages in a Popkin’s chat',
          email: false,
          phone: true,
          required: false,
          offForEveryone: false,
        },
      ],
    },
  ],
};

const saved = (): Observable<void> => of(undefined);
const failed = (): Observable<void> => throwError(() => new Error('down'));

const device = { outcome: 'on' as PushOutcome, subscribe: vi.fn(), unsubscribe: vi.fn() };

function storeWith(api: Partial<NotificationsApi>): {
  store: NotificationSettingsStore;
  toaster: Toaster;
} {
  device.subscribe.mockImplementation(() => Promise.resolve(device.outcome));
  device.subscribe.mockClear();
  TestBed.configureTestingModule({
    providers: [
      NotificationSettingsStore,
      { provide: NOTIFICATIONS_API, useValue: { settings: () => of(settings), ...api } },
      { provide: PUSH_SUBSCRIBER, useValue: device },
    ],
  });
  return { store: TestBed.inject(NotificationSettingsStore), toaster: TestBed.inject(Toaster) };
}

const groupChat = (store: NotificationSettingsStore) => store.settings()!.groups[0].kinds[0];

describe('NotificationSettingsStore', () => {
  it('reads the settings and is ready', () => {
    const { store } = storeWith({});

    store.open();

    expect(store.state()).toBe('ready');
    expect(store.settings()).toEqual(settings);
  });

  it('is pending while the settings are on their way', () => {
    const { store } = storeWith({ settings: () => new Subject<NotificationSettingsView>() });

    store.open();

    expect(store.state()).toBe('pending');
    expect(store.settings()).toBeNull();
  });

  it('fails when the settings cannot be read, and reads them again on open', () => {
    let fail = true;
    const { store } = storeWith({ settings: () => (fail ? failed() : of(settings)) as never });

    store.open();
    expect(store.state()).toBe('error');

    fail = false;
    store.open();
    expect(store.state()).toBe('ready');
  });

  it('shows a switched kind at once and saves that channel only', () => {
    const answer = new Subject<void>();
    const setKind = vi.fn(() => answer);
    const { store } = storeWith({ setKind });
    store.open();

    store.setKind('GroupChat', 'email', true);

    expect(groupChat(store).email).toBe(true);
    expect(setKind).toHaveBeenCalledWith('GroupChat', { email: true });
  });

  it('puts a kind back and says so when saving fails', () => {
    const { store, toaster } = storeWith({ setKind: failed });
    store.open();

    store.setKind('GroupChat', 'phone', false);

    expect(groupChat(store).phone).toBe(true);
    expect(toaster.toasts().map((t) => t.heading)).toEqual([SAVE_FAILED]);
  });

  it('raises the banner once email is off, and turning it on closes it', () => {
    const { store } = storeWith({ setEmail: saved });
    store.open();

    store.setEmail(false);
    expect(store.settings()!.email.on).toBe(false);
    expect(store.banner()).toBe('unsubscribed');
    expect(store.emailBlocked()).toBe(true);

    store.setEmail(true);
    expect(store.banner()).toBeNull();
    expect(store.emailBlocked()).toBe(false);
  });

  it('raises no banner when switching email off fails', () => {
    const { store } = storeWith({ setEmail: failed });
    store.open();

    store.setEmail(false);

    expect(store.settings()!.email.on).toBe(true);
    expect(store.banner()).toBeNull();
  });

  it('chooses a frequency at once and puts it back when saving fails', () => {
    const { store } = storeWith({ setFrequency: failed });
    store.open();

    store.setFrequency('DailyDigest');

    expect(store.settings()!.email.frequency).toBe('AsItHappens');
  });

  it('blocks email for an account without an email address', () => {
    const { store } = storeWith({
      settings: () =>
        of({ ...settings, email: { on: false, available: false, frequency: 'AsItHappens' } }),
    });
    store.open();

    expect(store.emailBlocked()).toBe(true);
  });

  it('dismisses the banner', () => {
    const { store } = storeWith({ setEmail: saved });
    store.open();
    store.setEmail(false);

    store.dismissBanner();

    expect(store.banner()).toBeNull();
  });

  it('asks this device to allow alerts when a phone switch is turned on', async () => {
    device.outcome = 'on';
    const { store } = storeWith({ setKind: saved });
    store.open();

    store.setKind('GroupChat', 'phone', true);
    await Promise.resolve();

    expect(device.subscribe).toHaveBeenCalledOnce();
    expect(store.refusedOnThisDevice().size).toBe(0);
  });

  it('keeps the switch on and notes a device that refused alerts', async () => {
    device.outcome = 'blocked';
    const { store } = storeWith({ setKind: saved });
    store.open();

    store.setKind('GroupChat', 'phone', true);
    await vi.waitFor(() => expect(store.refusedOnThisDevice().has('GroupChat')).toBe(true));

    expect(groupChat(store).phone).toBe(true);
    store.setKind('GroupChat', 'phone', false);
    await vi.waitFor(() => expect(store.refusedOnThisDevice().has('GroupChat')).toBe(false));
  });

  it('does not ask the device when an email switch changes', () => {
    const { store } = storeWith({ setKind: saved });
    store.open();

    store.setKind('GroupChat', 'email', true);

    expect(device.subscribe).not.toHaveBeenCalled();
  });
});
