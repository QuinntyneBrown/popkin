import { describe, expect, it } from 'vitest';
import { KeyDateRowView } from '../../models/contacts';
import {
  dateLine,
  dateTitle,
  dateWhen,
  dayFromInput,
  leadLabel,
  monthGroups,
  profileDateLine,
} from './contact-dates-text';

const row = (over: Partial<KeyDateRowView>): KeyDateRowView => ({
  id: '1',
  contactId: 'c',
  firstName: 'Grace',
  photoUrl: null,
  initials: 'GA',
  accent: 'Plum',
  kind: 'Birthday',
  title: null,
  occursOn: '2026-09-19',
  daysLeft: 4,
  years: 33,
  lead: 'OneWeekBefore',
  ...over,
});

describe('Dates text (L2-137, known gaps 103 and 113)', () => {
  it.each([
    [0, 'today'],
    [1, 'tomorrow'],
    [4, 'in 4 days'],
  ])('%i days away reads %s', (days, text) => {
    expect(dateWhen(days)).toBe(text);
  });

  it.each([
    [{ kind: 'Birthday' as const }, 'Grace’s birthday'],
    [{ kind: 'Anniversary' as const }, 'Grace’s anniversary'],
    [{ kind: 'Other' as const, title: 'Iris is one month old' }, 'Iris is one month old'],
    [{ kind: 'Milestone' as const, title: 'Five years at the studio' }, 'Five years at the studio'],
  ])('%o is titled %s', (over, title) => {
    expect(dateTitle(row(over))).toBe(title);
  });

  it.each([
    [{ kind: 'Birthday' as const, years: 33 }, 'Turns 33'],
    [{ kind: 'Anniversary' as const, years: 5 }, '5 years married'],
    [{ kind: 'Anniversary' as const, years: 1 }, '1 year married'],
    [{ kind: 'Other' as const, years: 2 }, '2 years'],
    [{ kind: 'Birthday' as const, years: null }, undefined],
  ])('%o has the line %s', (over, line) => {
    expect(dateLine(row(over))).toBe(line);
  });

  it('names the six lead times', () => {
    expect(leadLabel('OnTheDay')).toBe('On the day');
    expect(leadLabel('OneMonthBefore')).toBe('1 month before');
  });

  it('groups the dates by month, a later year named with its year', () => {
    const groups = monthGroups(
      [
        row({ id: 'a', occursOn: '2026-09-19' }),
        row({ id: 'b', occursOn: '2026-09-26' }),
        row({ id: 'c', occursOn: '2027-01-24' }),
      ],
      new Date(2026, 8, 15),
    );

    expect(groups.map((g) => [g.id, g.heading, g.dates.length])).toEqual([
      ['m-2026-09', 'September', 2],
      ['m-2027-01', 'January 2027', 1],
    ]);
  });

  it('reads a profile date with the days left at 30 or fewer (gap 101)', () => {
    const today = new Date(2026, 8, 15);
    expect(profileDateLine({ nextOn: '2026-09-26', month: 9, day: 26 }, today)).toBe(
      'Sat, Sep 26 · in 11 days',
    );
    expect(profileDateLine({ nextOn: '2027-01-24', month: 1, day: 24 }, today)).toBe('Jan 24');
    expect(profileDateLine({ nextOn: null, month: 10, day: 5 }, today)).toBe('Oct 5');
  });

  it('reads the day field: an every-year date keeps a year before this one only', () => {
    const today = new Date(2026, 8, 15);
    expect(dayFromInput('1993-09-19', true, today)).toEqual({ month: 9, day: 19, year: 1993 });
    expect(dayFromInput('2026-09-19', true, today)).toEqual({ month: 9, day: 19, year: null });
    expect(dayFromInput('2027-09-04', false, today)).toEqual({ month: 9, day: 4, year: 2027 });
    expect(dayFromInput('', true, today)).toBeNull();
  });
});
