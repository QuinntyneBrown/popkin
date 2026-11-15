import { describe, expect, it } from 'vitest';
import { dayHeading, isMany, offCount, weekdaysLabel } from './time-off-text';

describe('offCount', () => {
  it.each([
    [0, 6, '0 of 6 off'],
    [5, 6, '5 of 6 off'],
    [1, 1, '1 of 1 off'],
  ])('%i of %i reads "%s"', (off, members, text) => expect(offCount(off, members)).toBe(text));
});

describe('isMany', () => {
  // Every member but at most one is off (L2-072 AC6).
  it.each([
    [6, 6, true],
    [5, 6, true],
    [4, 6, false],
    [0, 6, false],
    [2, 3, true],
    [1, 3, false],
    [1, 2, true],
    [1, 1, true],
    [0, 1, false],
  ])('%i of %i off is bold: %s', (off, members, bold) => expect(isMany(off, members)).toBe(bold));
});

describe('dayHeading', () => {
  it.each([
    ['2027-02-15', 'Mon', '15'],
    ['2027-02-20', 'Sat', '20'],
    ['2027-03-07', 'Sun', '7'],
  ])('%s is %s %s', (day, weekday, date) => expect(dayHeading(day)).toEqual({ weekday, date }));
});

describe('weekdaysLabel', () => {
  // L2-073 AC1: Monday to Friday, with the year when it is not the viewer's.
  it.each([
    ['2027-02-15', 'Feb 15 – 19'],
    ['2027-03-29', 'Mar 29 – Apr 2'],
    ['2028-02-21', 'Feb 21 – 25, 2028'],
    ['2026-12-28', 'Dec 28 – Jan 1, 2026'],
  ])('%s is "%s"', (monday, label) => expect(weekdaysLabel(monday, '2027-02-17')).toBe(label));
});
