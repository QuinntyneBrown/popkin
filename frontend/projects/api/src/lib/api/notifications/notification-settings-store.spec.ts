import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { NotificationSettingsView } from '../../models/notifications';
import { CONTACTS_API } from '../contacts/contacts-api';
import { Toaster } from '../toasts/toaster';
import { NOTIFICATIONS_API, NotificationsApi } from './notifications-api';
import { NotificationSettingsStore, SAVE_FAILED, popkinLine } from './notification-settings-store';
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
  popkins: [
    {
      popkinId: 'p1',
      name: 'Lakeside Weekend',
      emoji: '🏕️',
      colour: 'Teal',
      people: 14,
      endsAt: null,
      level: 'Everything',
    },
  ],
  muted: [
    {
      muteId: 'm1',
      name: 'Sam Ortega',
      avatar: { initials: 'SO', accent: 'Amber', photoUrl: null },
      sharedPopkins: ['Thursday Night Group'],
    },
  ],
  birthdays: [
    {
      keyDateId: 'k1',
      contactId: 'c1',
      name: 'Grace Adeyemi',
      photoUrl: null,
      initials: 'GA',
      accent: 'Plum',
      occursOn: '2026-09-19',
      turns: 33,
      inDays: 7,
      lead: 'OneWeekBefore',
      remindersOn: true,
    },
  ],
  birthdayCount: 1,
};

const saved = (): Observable<void> => of(undefined);
const failed = (): Observable<void> => throwError(() => new Error('down'));

const contacts = { changeKeyDateReminder: vi.fn() };

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
      { provide: CONTACTS_API, useValue: contacts },
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

  describe('Popkin levels', () => {
    const lakeside = (store: NotificationSettingsStore) => store.settings()!.popkins[0];

    it('shows a level at once and saves it', () => {
      const answer = new Subject<void>();
      const setLevel = vi.fn(() => answer);
      const { store } = storeWith({ setLevel });
      store.open();

      store.setLevel('p1', 'JustForMe');

      expect(lakeside(store).level).toBe('JustForMe');
      expect(setLevel).toHaveBeenCalledWith('p1', 'JustForMe');
      expect(store.banner()).toBeNull();
    });

    it('raises the muted bar on Muted, and Undo puts Everything back', () => {
      const setLevel = vi.fn(saved);
      const { store } = storeWith({ setLevel });
      store.open();

      store.setLevel('p1', 'Muted');
      expect(store.banner()).toBe('popkinMuted');
      expect(store.mutedText()).toBe('Lakeside Weekend is muted. You’ll still get its reminders.');

      store.undo();
      expect(lakeside(store).level).toBe('Everything');
      expect(setLevel).toHaveBeenLastCalledWith('p1', 'Everything');
      expect(store.banner()).toBeNull();
    });

    it('puts the old level back when saving fails', () => {
      const { store, toaster } = storeWith({ setLevel: failed });
      store.open();

      store.setLevel('p1', 'Muted');

      expect(lakeside(store).level).toBe('Everything');
      expect(store.banner()).toBeNull();
      expect(toaster.toasts().map((t) => t.heading)).toEqual([SAVE_FAILED]);
    });
  });

  describe('a footer link', () => {
    it('mutes the Popkin it names once the settings arrive, with the bar that can undo it', () => {
      const answer = new Subject<NotificationSettingsView>();
      const setLevel = vi.fn(saved);
      const { store } = storeWith({ settings: () => answer, setLevel });

      store.open({ tab: 'popkins', mute: { popkinId: 'p1' } });
      expect(setLevel).not.toHaveBeenCalled();
      answer.next(settings);

      expect(store.settings()!.popkins[0].level).toBe('Muted');
      expect(setLevel).toHaveBeenCalledWith('p1', 'Muted');
      expect(store.banner()).toBe('popkinMuted');
    });

    it('changes nothing for a Popkin the person is not in', () => {
      const setLevel = vi.fn(saved);
      const { store } = storeWith({ setLevel });

      store.open({ tab: 'popkins', mute: { popkinId: 'elsewhere' } });

      expect(setLevel).not.toHaveBeenCalled();
      expect(store.banner()).toBeNull();
    });

    it('stops the birthday it names, with the bar that can undo it (L2-159 AC5)', () => {
      contacts.changeKeyDateReminder.mockReturnValue(of({}));
      const { store } = storeWith({});

      store.open({ tab: 'people', mute: { keyDateId: 'k1' } });

      expect(contacts.changeKeyDateReminder).toHaveBeenCalledWith('k1', { on: false });
      expect(store.settings()!.birthdays[0].remindersOn).toBe(false);
      expect(store.banner()).toBe('birthdayOff');
    });

    it('changes nothing for a link with no mute', () => {
      const setLevel = vi.fn(saved);
      const { store } = storeWith({ setLevel });

      store.open({ tab: 'types' });

      expect(setLevel).not.toHaveBeenCalled();
      expect(store.settings()).toEqual(settings);
    });
  });

  describe('popkinLine', () => {
    const now = new Date('2026-11-17T12:00:00Z');
    const row = { people: 14, endsAt: null as string | null, level: 'Everything' as const };

    it.each([
      [null, '14 people · ongoing'],
      ['2026-11-22T20:00:00Z', '14 people · wraps up Sunday'],
      ['2026-11-30T20:00:00Z', '14 people · until Nov 30'],
    ])('reads an end of %s as "%s"', (endsAt, line) => {
      expect(popkinLine({ ...row, endsAt }, now)).toBe(line);
    });

    it('says a muted Popkin sends nothing but reminders', () => {
      expect(popkinLine({ ...row, level: 'Muted' }, now)).toBe('Muted. Nothing but reminders');
    });

    it('counts one person', () => {
      expect(popkinLine({ ...row, people: 1 }, now)).toBe('1 person · ongoing');
    });
  });

  describe('muted people', () => {
    const joel = {
      membershipId: 'j1',
      name: 'Joel Kim',
      avatar: { initials: 'JK', accent: 'Sky' as const, photoUrl: null },
      sharedPopkins: ['Lakeside Weekend'],
    };

    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('searches 250 ms after the last keystroke, and an older answer is dropped', () => {
      const answers: Subject<(typeof joel)[]>[] = [];
      const muteCandidates = vi.fn(() => {
        const answer = new Subject<(typeof joel)[]>();
        answers.push(answer);
        return answer;
      });
      const { store } = storeWith({ muteCandidates });
      store.open();

      store.searchMuteCandidates('Jo');
      vi.advanceTimersByTime(249);
      expect(muteCandidates).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      store.searchMuteCandidates('Joe');
      vi.advanceTimersByTime(250);
      answers[0].next([]);
      answers[1].next([joel]);

      expect(muteCandidates.mock.calls).toEqual([['Jo'], ['Joe']]);
      expect(store.candidates()).toEqual([joel]);
    });

    it('adds the person muted, newest first', () => {
      const muted = { muteId: 'm2', ...joel };
      const { store } = storeWith({ mute: vi.fn(() => of(muted)) });
      store.open();

      store.mute('j1');

      expect(store.settings()!.muted.map((m) => m.name)).toEqual(['Joel Kim', 'Sam Ortega']);
    });

    it('takes an unmuted person away at once, and puts them back if saving fails', () => {
      const answer = new Subject<void>();
      const { store, toaster } = storeWith({ unmute: vi.fn(() => answer) });
      store.open();

      store.unmute('m1');
      expect(store.settings()!.muted).toEqual([]);
      answer.error(new Error('down'));

      expect(store.settings()!.muted.map((m) => m.name)).toEqual(['Sam Ortega']);
      expect(toaster.toasts().map((t) => t.heading)).toEqual([SAVE_FAILED]);
    });
  });

  describe('birthdays by person', () => {
    beforeEach(() => contacts.changeKeyDateReminder.mockReset());

    it('changes a lead at once through Contacts, and raises no bar', () => {
      contacts.changeKeyDateReminder.mockReturnValue(of({}));
      const { store } = storeWith({});
      store.open();

      store.setBirthdayReminder('k1', { lead: 'TwoWeeksBefore' });

      expect(contacts.changeKeyDateReminder).toHaveBeenCalledWith('k1', { lead: 'TwoWeeksBefore' });
      expect(store.settings()!.birthdays[0].lead).toBe('TwoWeeksBefore');
      expect(store.banner()).toBeNull();
    });

    it('switches a birthday off with its bar, and Undo turns it on again (L2-159 AC4, AC5)', () => {
      contacts.changeKeyDateReminder.mockReturnValue(of({}));
      const { store } = storeWith({});
      store.open();

      store.setBirthdayReminder('k1', { on: false });

      expect(store.settings()!.birthdays[0]).toMatchObject({
        remindersOn: false,
        lead: 'OneWeekBefore',
      });
      expect(store.banner()).toBe('birthdayOff');
      expect(store.birthdayOffText()).toBe(
        'Birthday reminders for Grace Adeyemi are off. The birthday stays in your contacts.',
      );

      store.undo();

      expect(contacts.changeKeyDateReminder).toHaveBeenLastCalledWith('k1', { on: true });
      expect(store.settings()!.birthdays[0].remindersOn).toBe(true);
      expect(store.banner()).toBeNull();
    });

    it('puts the birthday back and says so when saving fails', () => {
      contacts.changeKeyDateReminder.mockReturnValue(throwError(() => new Error('down')));
      const { store, toaster } = storeWith({});
      const show = vi.spyOn(toaster, 'show');
      store.open();

      store.setBirthdayReminder('k1', { on: false });

      expect(store.settings()!.birthdays[0].remindersOn).toBe(true);
      expect(store.banner()).toBeNull();
      expect(show).toHaveBeenCalledWith('danger', SAVE_FAILED);
    });
  });
});
