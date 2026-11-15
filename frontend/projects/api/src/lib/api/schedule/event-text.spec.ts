import { describe, expect, it } from 'vitest';
import { eventDays, eventError, eventHint } from './event-text';

describe('eventDays', () => {
  // docs/detailed-designs/schedules/set-the-event
  it.each([
    ['2026-09-25', '2026-09-27', 'Sep 25 – 27'],
    ['2027-02-27', '2027-03-02', 'Feb 27 – Mar 2'],
    ['2026-12-30', '2027-01-02', 'Dec 30 2026 – Jan 2 2027'],
    ['2026-09-25', '2026-09-25', 'Sep 25'],
  ])('%s to %s reads %s', (first, last, label) => expect(eventDays(first, last)).toBe(label));
});

describe('eventHint', () => {
  // L2-085 AC1: the row of "Popkin settings".
  it('names the event and its days', () =>
    expect(
      eventHint({ label: 'Lake weekend', firstDay: '2026-09-25', lastDay: '2026-09-27' }),
    ).toBe('Lake weekend · Sep 25 – 27'));

  it('says when there is none', () => expect(eventHint(null)).toBe('Not set'));
});

describe('eventError', () => {
  const today = '2026-09-12';
  // L2-085 AC2: the first rule broken, and the field it is on.
  it.each([
    [{ label: 'Lake weekend', firstDay: '2026-09-25', lastDay: '2026-09-27' }, null],
    [{ label: 'Lake weekend', firstDay: '2026-09-25', lastDay: '2026-09-25' }, null],
    [
      { label: '   ', firstDay: '2026-09-25', lastDay: '2026-09-27' },
      { field: 'label', message: 'Give the event a label.' },
    ],
    [
      { label: 'Lake weekend', firstDay: '', lastDay: '2026-09-27' },
      { field: 'firstDay', message: 'Pick the first day.' },
    ],
    [
      { label: 'Lake weekend', firstDay: '2026-09-25', lastDay: '' },
      { field: 'lastDay', message: 'Pick the last day.' },
    ],
    [
      { label: 'Lake weekend', firstDay: '2026-09-25', lastDay: '2026-09-24' },
      { field: 'lastDay', message: 'The last day is before the first day.' },
    ],
    [
      { label: 'Lake weekend', firstDay: '2027-09-13', lastDay: '2027-09-14' },
      { field: 'firstDay', message: 'The event can be set up to a year ahead.' },
    ],
    [{ label: 'Lake weekend', firstDay: '2027-09-12', lastDay: '2027-09-14' }, null],
  ])('%j is %j', (event, error) => expect(eventError(event, today)).toEqual(error));
});
