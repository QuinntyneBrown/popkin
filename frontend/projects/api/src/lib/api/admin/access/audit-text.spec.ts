import { describe, expect, it } from 'vitest';
import { AuditEntry } from '../../../models/admin';
import { groupByDay, showingText, timeText } from './audit-text';

function entry(id: number, at: string): AuditEntry {
  return {
    id,
    at,
    adminId: null,
    adminName: 'Popkin',
    action: 'AddedAdmin',
    actionLabel: 'Added admin',
    targetKind: 'Admin',
    targetId: 'a',
    targetName: 'Lena Fischer',
    reason: null,
    details: '{}',
  };
}

describe('groupByDay', () => {
  const now = new Date('2026-07-14T12:00:00Z');

  it('names today, yesterday and older days in the time zone given', () => {
    const days = groupByDay(
      [
        entry(4, '2026-07-14T09:39:00Z'),
        entry(3, '2026-07-14T07:00:00Z'),
        entry(2, '2026-07-13T21:04:00Z'),
        entry(1, '2026-07-11T08:00:00Z'),
      ],
      now,
      'Europe/London',
    );

    expect(days.map((day) => [day.label, day.entries.map((e) => e.id)])).toEqual([
      ['Today', [4, 3]],
      ['Yesterday', [2]],
      ['Sat 11 Jul', [1]],
    ]);
  });

  it('puts an entry on the day it was where the admin is', () => {
    // 23:30 UTC on the 13th is already the 14th in London's summer time.
    const days = groupByDay([entry(1, '2026-07-13T23:30:00Z')], now, 'Europe/London');

    expect(days[0].label).toBe('Today');
  });

  it('has no day for no entries', () => {
    expect(groupByDay([], now, 'Europe/London')).toEqual([]);
  });
});

describe('timeText', () => {
  it.each([
    ['2026-07-14T09:39:00Z', '10:39'],
    ['2026-07-14T23:05:00Z', '00:05'],
    ['2026-01-14T09:39:00Z', '09:39'],
  ])('writes %s as %s in London', (at, text) => {
    expect(timeText(at, 'Europe/London')).toBe(text);
  });
});

describe('showingText', () => {
  it.each([
    [10, 1284, undefined, 'Showing 10 of 1,284 actions'],
    [3, 212, 'Aiko Tanaka', 'Showing 3 of 212 actions by Aiko Tanaka'],
    [1, 1, undefined, 'Showing 1 of 1 action'],
  ])('shows %i of %i', (shown, total, adminName, text) => {
    expect(showingText(shown, total, adminName)).toBe(text);
  });
});
