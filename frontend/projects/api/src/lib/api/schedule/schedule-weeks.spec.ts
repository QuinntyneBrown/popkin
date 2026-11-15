import { describe, expect, it } from 'vitest';
import {
  daysOf,
  firstWeekOf,
  holdsEvent,
  isWithinAYear,
  isoDate,
  monthOf,
  mondayOf,
  weekLabel,
  weeksOfMonth,
} from './schedule-weeks';

describe('mondayOf', () => {
  it.each([
    ['2027-02-15', '2027-02-15'],
    ['2027-02-17', '2027-02-15'],
    ['2027-02-21', '2027-02-15'],
    ['2027-02-22', '2027-02-22'],
    ['2027-01-01', '2026-12-28'],
  ])('%s is in the week of %s', (day, monday) => expect(mondayOf(day)).toBe(monday));
});

describe('isoDate', () => {
  it('is the day on the device, not in UTC', () =>
    expect(isoDate(new Date(2027, 1, 17, 23, 30))).toBe('2027-02-17'));
});

describe('daysOf', () => {
  it('is Monday to Sunday', () =>
    expect(daysOf('2027-02-15')).toEqual([
      '2027-02-15',
      '2027-02-16',
      '2027-02-17',
      '2027-02-18',
      '2027-02-19',
      '2027-02-20',
      '2027-02-21',
    ]));
});

describe('weekLabel', () => {
  it.each([
    ['2027-02-15', 7, 'Feb 15 – 21'],
    ['2027-02-15', 5, 'Feb 15 – 19'],
    ['2027-02-22', 7, 'Feb 22 – 28'],
    ['2027-03-29', 7, 'Mar 29 – Apr 4'],
    ['2026-12-28', 7, 'Dec 28 – Jan 3'],
  ])('the week of %s over %i days reads "%s"', (monday, days, label) =>
    expect(weekLabel(monday, days)).toBe(label),
  );
});

describe('monthOf', () => {
  it.each([
    ['2027-02-15', 'February', '2027'],
    // A week belongs to the month of its Monday.
    ['2027-03-29', 'March', '2027'],
    ['2026-12-28', 'December', '2026'],
  ])('the week of %s is in %s %s', (monday, month, year) =>
    expect(monthOf(monday)).toEqual({ month, year }),
  );
});

describe('weeksOfMonth', () => {
  it('is every week whose Monday is in the month', () =>
    expect(weeksOfMonth('2027-02-15')).toEqual([
      '2027-02-01',
      '2027-02-08',
      '2027-02-15',
      '2027-02-22',
    ]));
  it('starts with the first Monday of the month', () =>
    expect(weeksOfMonth('2027-03-08')).toEqual([
      '2027-03-01',
      '2027-03-08',
      '2027-03-15',
      '2027-03-22',
      '2027-03-29',
    ]));
});

describe('firstWeekOf', () => {
  it.each([
    ['2027-02-15', 1, '2027-03-01'],
    ['2027-02-15', -1, '2027-01-04'],
    ['2027-01-04', -1, '2026-12-07'],
    ['2026-12-28', 1, '2027-01-04'],
  ])('from the week of %s, %i month is the week of %s', (monday, step, first) =>
    expect(firstWeekOf(monday, step)).toBe(first),
  );
});

describe('holdsEvent', () => {
  const event = { label: 'Cabin week', firstDay: '2027-02-19', lastDay: '2027-02-23' };
  it.each([
    ['2027-02-08', false],
    ['2027-02-15', true],
    ['2027-02-22', true],
    ['2027-03-01', false],
  ])('the week of %s holds the event: %s', (monday, holds) =>
    expect(holdsEvent(monday, event)).toBe(holds),
  );
  it('is false with no event', () => expect(holdsEvent('2027-02-15', null)).toBe(false));
});

describe('isWithinAYear', () => {
  // L2-073 AC5: a week's Monday at most 365 days after the viewer's today.
  it.each([
    ['2027-02-15', true], // this week
    ['2026-01-05', true], // a week gone by
    ['2028-02-14', true], // 362 days ahead
    ['2028-02-17', true], // exactly 365 days
    ['2028-02-21', false], // 369 days ahead
  ])('%s from 2027-02-17 is %s', (monday, within) =>
    expect(isWithinAYear(monday, '2027-02-17')).toBe(within),
  );
});
