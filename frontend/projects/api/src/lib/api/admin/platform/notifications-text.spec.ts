import { describe, expect, it } from 'vitest';
import { AdminNotificationKind, AdminSendStatus } from '../../../models/admin';
import {
  kindAbout,
  kindDialog,
  kindInSentence,
  kindOpened,
  kindSent,
  kindToast,
  kindTotals,
  resumeDialog,
  statusText,
  statusTitle,
} from './notifications-text';

const zone = 'Europe/London';

const sending = (change: Partial<AdminSendStatus> = {}): AdminSendStatus => ({
  paused: false,
  pausedAt: null,
  pausedByName: null,
  pauseReason: null,
  queued: 0,
  resumeMinutes: null,
  sentToday: 48210,
  bouncedPercent: 0.4,
  medianSecondsToInbox: 41,
  ...change,
});

const kind = (change: Partial<AdminNotificationKind> = {}): AdminNotificationKind => ({
  kind: 'NewPhotos',
  name: 'New photos',
  about: 'Photos added to an album',
  required: false,
  offForEveryone: false,
  offSince: null,
  offByName: null,
  offReason: null,
  sent24h: 7390,
  openedPercent: 47,
  ...change,
});

describe('notifications text (L2-169, L2-170, L2-171)', () => {
  it('says whether email is sending (L2-169 AC2, AC3)', () => {
    expect(statusTitle(sending())).toBe('Email is sending');
    expect(statusTitle(sending({ paused: true }))).toBe('All member email is paused');
  });

  it.each([
    [sending(), '48,210 sent today · 0.4% bounced · median 41 s from change to inbox'],
    [
      sending({ bouncedPercent: null, medianSecondsToInbox: null }),
      '48,210 sent today · — bounced · median — from change to inbox',
    ],
    [
      sending({ sentToday: 0, bouncedPercent: 0, medianSecondsToInbox: 185 }),
      '0 sent today · 0% bounced · median 3 min from change to inbox',
    ],
  ])('reads the day’s totals while sending', (status, text) => {
    expect(statusText(status, zone)).toBe(text);
  });

  it('reads what is queued, since when, by whom and why while paused (L2-169 AC3)', () => {
    const paused = sending({
      paused: true,
      pausedAt: '2026-07-14T09:12:00Z',
      pausedByName: 'Lena Fischer',
      pauseReason: 'Digest sending twice.',
      queued: 3240,
    });
    expect(statusText(paused, zone)).toBe(
      '3,240 emails queued since 10:12, paused by Lena Fischer: “Digest sending twice.” Sign-in codes still go out.',
    );
    expect(statusText({ ...paused, queued: 1, pauseReason: null }, zone)).toBe(
      '1 email queued since 10:12, paused by Lena Fischer. Sign-in codes still go out.',
    );
  });

  it('reads a kind’s totals, or dashes while it is off for everyone (L2-169 AC4, L2-171 AC2)', () => {
    expect([kindSent(kind()), kindOpened(kind()), kindTotals(kind())]).toEqual([
      '7,390',
      '47%',
      '7,390 sent · 47% opened',
    ]);
    expect(kindOpened(kind({ openedPercent: null }))).toBe('—');
    const off = kind({ offForEveryone: true });
    expect([kindSent(off), kindOpened(off), kindTotals(off)]).toEqual([
      '—',
      '—',
      '— sent · — opened',
    ]);
  });

  it('says why a kind is off in place of what sends it (L2-171 AC2)', () => {
    expect(kindAbout(kind(), zone)).toBe('Photos added to an album');
    expect(
      kindAbout(
        kind({
          offForEveryone: true,
          offSince: '2026-07-09T08:00:00Z',
          offByName: 'Lena Fischer',
          offReason: 'Rating emails firing on every star change',
        }),
        zone,
      ),
    ).toBe('Off since 9 Jul by Lena Fischer: “Rating emails firing on every star change”');
  });

  it.each([
    ['New photos', 'new photos'],
    ['Experiences', 'experiences'],
    ['Popkin wrapping up', 'Popkin wrapping up'],
  ])('names %s inside a sentence', (name, inSentence) => {
    expect(kindInSentence(name)).toBe(inSentence);
  });

  it('asks before a kind goes off or back on (L2-171 AC1, AC3)', () => {
    expect(kindDialog('New photos', false)).toMatchObject({
      heading: 'Turn new photos off for everyone?',
      description:
        'No member gets new photos by email or phone, whatever their settings. Their own choices are kept and come back when you switch it on.',
      confirm: 'Turn off for everyone',
      keep: 'Keep it on',
    });
    expect(kindDialog('Experiences', true)).toMatchObject({
      heading: 'Turn experiences back on?',
      description:
        'Experiences start sending again from the next change, to members who have them on.',
      confirm: 'Turn on',
    });
    expect(kindDialog('Group chat', true).description).toBe(
      'Group chat starts sending again from the next change, to members who have it on.',
    );
    expect(kindToast('Experiences', true)[0]).toBe('Experiences is back on');
    expect(kindToast('New photos', false)[0]).toBe('New photos is off for everyone');
  });

  it('says how many queued emails send and about how long (L2-170 AC3)', () => {
    expect(
      resumeDialog(sending({ paused: true, queued: 3240, resumeMinutes: 4 })).description,
    ).toBe(
      '3,240 queued emails send in order over about 4 minutes. Changes older than 6 hours are dropped rather than sent late.',
    );
  });
});
