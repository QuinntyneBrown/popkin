import {
  habitFoot,
  habitLate,
  habitLoggedFor,
  habitNext,
  habitRhythmLabel,
  habitRun,
  habitSub,
  habitTitle,
  habitDueBy,
} from './habits-text';

const today = new Date('2026-09-15T08:40:00');

describe('habits text', () => {
  it.each([
    ['Weekly', 'Weekly'],
    ['EveryTwoWeeks', 'Every 2 weeks'],
    ['Monthly', 'Monthly'],
  ] as const)('names %s "%s"', (rhythm, label) => {
    expect(habitRhythmLabel(rhythm)).toBe(label);
  });

  it('names a habit by what and first name', () => {
    expect(habitTitle('Lunch', 'Chidi')).toBe('Lunch with Chidi');
  });

  it.each([
    [1, 'One day overdue'],
    [2, 'Two days overdue'],
    [9, 'Nine days overdue'],
    [10, '10 days overdue'],
  ])('says %i days late as "%s"', (late, words) => {
    expect(habitLate(late)).toBe(words);
  });

  it('says how much has been kept with the rhythm', () => {
    expect(habitSub('EveryTwoWeeks', 9, 12)).toBe('Every 2 weeks · you’ve kept 9 of the last 12');
  });

  it.each([
    ['Weekly', 0, undefined],
    ['Weekly', 1, undefined],
    ['Weekly', 10, '10 weeks running'],
    ['EveryTwoWeeks', 3, '3 fortnights running'],
    ['Monthly', 8, '8 months running'],
  ] as const)('runs %s %i as %s', (rhythm, run, words) => {
    expect(habitRun(run, rhythm)).toBe(words);
  });

  it.each([
    ['2026-09-20', 'Next Sun, Sep 20'],
    ['2026-09-15', 'Due today'],
    ['2026-09-13', 'Overdue since Sep 13'],
  ])('reads the next of a row due %s', (dueOn, words) => {
    expect(habitNext(dueOn, today)).toBe(words);
  });

  it.each([
    ['2026-10-11', 'Next: Oct 11'],
    ['2026-09-15', 'Due today'],
    ['2026-09-13', 'Overdue since Sep 13'],
  ])('reads the profile’s foot due %s', (dueOn, words) => {
    expect(habitFoot(dueOn, today)).toBe(words);
  });

  it.each([
    ['Weekly', 'Logged for this week'],
    ['EveryTwoWeeks', 'Logged for this fortnight'],
    ['Monthly', 'Logged for this month'],
  ] as const)('logs %s for its period', (rhythm, words) => {
    expect(habitLoggedFor(rhythm)).toBe(words);
  });

  it('says when the next is due once kept', () => {
    expect(habitDueBy('2026-09-29')).toBe('Your next one is due by Tue, Sep 29.');
  });
});
