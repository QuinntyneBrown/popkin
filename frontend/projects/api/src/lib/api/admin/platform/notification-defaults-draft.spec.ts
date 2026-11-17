import { describe, expect, it } from 'vitest';
import { AdminNotificationDefaults } from '../../../models/admin';
import {
  NotificationDefaultField,
  NotificationDefaultsDraft,
  activityEmailHelp,
  defaultsFoot,
} from './notification-defaults-draft';

/** The first values of L2-161 and L2-173 AC2. */
const first: AdminNotificationDefaults = {
  activityEmail: 'AsItHappens',
  bundleMinutes: 10,
  mostEmailsPerDay: 12,
  quietFrom: '21:00',
  quietTo: '08:00',
  birthdayLead: 'OneWeekBefore',
  changedAt: null,
  changedByName: null,
};

const draft = () => new NotificationDefaultsDraft(first);
const errorOf = (field: NotificationDefaultField, value: string) =>
  draft().with(field, value).error(field);

describe('NotificationDefaultsDraft (L2-173)', () => {
  it('starts at the saved values, valid, with nothing unsaved', () => {
    const d = draft();
    expect(d.values).toEqual({
      activityEmail: 'AsItHappens',
      bundleMinutes: '10',
      mostEmailsPerDay: '12',
      quietFrom: '21:00',
      quietTo: '08:00',
      birthdayLead: 'OneWeekBefore',
    });
    expect(d.valid).toBe(true);
    expect(d.unsaved).toBe(0);
  });

  // One case per row of NotificationDefaultsRules: bundling, 1 to 60.
  it.each([
    ['0', 'Enter a whole number from 1 to 60.'],
    ['1', null],
    ['60', null],
    ['61', 'Enter a whole number from 1 to 60.'],
    ['1.5', 'Enter a whole number from 1 to 60.'],
    ['', 'Enter a whole number from 1 to 60.'],
    ['ten', 'Enter a whole number from 1 to 60.'],
  ])('bundles within "%s": %s', (value, error) => {
    expect(errorOf('bundleMinutes', value)).toBe(error);
  });

  // The daily most, 1 to 100.
  it.each([
    ['0', 'Enter a whole number from 1 to 100.'],
    ['1', null],
    ['100', null],
    ['101', 'Enter a whole number from 1 to 100.'],
  ])('sends at most "%s" a day: %s', (value, error) => {
    expect(errorOf('mostEmailsPerDay', value)).toBe(error);
  });

  // Quiet hours: a time on the hour or half hour.
  it.each([
    ['21:00', null],
    ['21:30', null],
    ['00:00', null],
    ['21:15', 'Enter a time on the hour or half hour, such as 21:00.'],
    ['25:00', 'Enter a time on the hour or half hour, such as 21:00.'],
    ['9:00', 'Enter a time on the hour or half hour, such as 21:00.'],
    ['', 'Enter a time on the hour or half hour, such as 21:00.'],
  ])('starts quiet hours at "%s": %s', (value, error) => {
    expect(errorOf('quietFrom', value)).toBe(error);
  });

  it('refuses quiet hours that start and end at the same time', () => {
    const d = draft().with('quietTo', '21:00');
    expect(d.error('quietTo')).toBe('Quiet hours can’t start and end at the same time.');
    expect(d.error('quietFrom')).toBeNull();
    expect(d.valid).toBe(false);
  });

  // Each birthday lead L2-173 AC2 allows, and one it doesn't.
  it.each([
    ['Off', null],
    ['OnTheDay', null],
    ['OneDayBefore', null],
    ['ThreeDaysBefore', null],
    ['OneWeekBefore', null],
    ['TwoWeeksBefore', 'Choose how early.'],
  ])('reminds of birthdays "%s": %s', (value, error) => {
    expect(errorOf('birthdayLead', value)).toBe(error);
  });

  it.each([
    ['AsItHappens', null],
    ['DailyDigest', null],
    ['WeeklyDigest', null],
    ['Hourly', 'Choose how often.'],
  ])('sends activity email "%s": %s', (value, error) => {
    expect(errorOf('activityEmail', value)).toBe(error);
  });

  it('counts each default changed once, quiet hours as one, and lists the changes', () => {
    const d = draft()
      .with('activityEmail', 'DailyDigest')
      .with('bundleMinutes', '20')
      .with('quietFrom', '22:00')
      .with('quietTo', '07:00');
    expect(d.unsaved).toBe(3);
    expect(d.changes).toEqual([
      { name: 'Activity email', from: 'As it happens', to: 'Daily digest', unit: '' },
      { name: 'Bundle changes within', from: '10', to: '20', unit: 'minutes' },
      { name: 'Quiet hours', from: '21:00 to 08:00', to: '22:00 to 07:00', unit: '' },
    ]);
  });

  it('does not count a value typed back as it was, or written with a leading zero', () => {
    expect(draft().with('bundleMinutes', '20').with('bundleMinutes', '10').unsaved).toBe(0);
    expect(draft().with('bundleMinutes', '010').unsaved).toBe(0);
    expect(draft().with('birthdayLead', 'Off').changes).toEqual([
      { name: 'Birthday reminders', from: '1 week before', to: 'Off', unit: '' },
    ]);
  });

  it('gives the request with numbers, and discards back to the saved values', () => {
    const d = draft().with('mostEmailsPerDay', ' 20 ').with('activityEmail', 'WeeklyDigest');
    expect(d.request()).toEqual({
      activityEmail: 'WeeklyDigest',
      bundleMinutes: 10,
      mostEmailsPerDay: 20,
      quietFrom: '21:00',
      quietTo: '08:00',
      birthdayLead: 'OneWeekBefore',
    });
    expect(d.discarded().unsaved).toBe(0);
  });

  it('says what each frequency sends', () => {
    expect(activityEmailHelp('AsItHappens', 10)).toBe(
      'One email per change, bundled if several land within 10 minutes.',
    );
    expect(activityEmailHelp('DailyDigest', 10)).toBe(
      'One email a day at 6 pm with everything that changed.',
    );
    expect(activityEmailHelp('WeeklyDigest', 10)).toBe(
      'One email on Sundays at 6 pm with everything that changed that week.',
    );
  });

  it('says who changed the defaults last, and when', () => {
    const now = new Date('2026-07-14T12:00:00Z');
    expect(defaultsFoot(first, now, 'UTC')).toBe('Nothing changed yet.');
    const changed = (at: string) => ({ ...first, changedAt: at, changedByName: 'Lena Fischer' });
    expect(defaultsFoot(changed('2026-07-14T08:00:00Z'), now, 'UTC')).toBe(
      'Last changed today by Lena Fischer.',
    );
    expect(defaultsFoot(changed('2026-07-12T08:00:00Z'), now, 'UTC')).toBe(
      'Last changed Sun 12 Jul by Lena Fischer.',
    );
  });
});
