import { BIRTHDAYS_SHOWN, birthdayLeads, birthdayLine } from './birthday-reminder-text';

describe('birthdayLine', () => {
  // occursOn | turns | days left | line (L2-159 AC1)
  it.each([
    ['2026-09-19', 33, 7, 'Sat 19 Sep · turns 33 · in 7 days'],
    ['2027-03-02', null, 171, 'Tue 2 Mar · in 171 days'],
    ['2026-09-13', 30, 1, 'Sun 13 Sep · turns 30 · tomorrow'],
    ['2026-09-12', null, 0, 'Sat 12 Sep · today'],
  ])('reads %s, turns %s, in %s days as "%s"', (occursOn, turns, inDays, line) => {
    expect(birthdayLine({ occursOn, turns, inDays })).toBe(line);
  });
});

describe('birthdayLeads', () => {
  it('offers the five lead times of L2-159', () => {
    expect(birthdayLeads('OneWeekBefore').map((o) => o.label)).toEqual([
      'On the day',
      '1 day before',
      '3 days before',
      '1 week before',
      '2 weeks before',
    ]);
  });

  it('keeps "1 month before" for a birthday that has it', () => {
    expect(birthdayLeads('OneMonthBefore').at(-1)).toEqual({
      value: 'OneMonthBefore',
      label: '1 month before',
    });
  });

  it('shows five before Show all', () => {
    expect(BIRTHDAYS_SHOWN).toBe(5);
  });
});
