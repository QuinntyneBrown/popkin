import { describe, expect, it } from 'vitest';
import {
  loggedAtLabel,
  logHeading,
  promiseWhen,
  timelineDay,
  tomorrowOf,
  yearlyHint,
  yearlyTitle,
} from './log-entry-text';

describe('Log and timeline text (L2-133, L2-134, L2-135)', () => {
  const today = new Date(2026, 8, 15, 8, 40);

  it('names the page by what is logged', () => {
    expect(logHeading('conversation', 'Chidi')).toBe('Talked with Chidi');
    expect(logHeading('milestone', 'Chidi')).toBe('Chidi’s milestone');
  });

  it('a day this year has no year; one before has', () => {
    expect(timelineDay('2026-09-06', today)).toBe('Sep 6');
    expect(timelineDay('2021-09-26', today)).toBe('Sep 26, 2021');
  });

  it('says when Log opened', () => {
    expect(loggedAtLabel(today)).toBe('Today, 8:40 am');
    expect(loggedAtLabel(new Date(2026, 8, 15, 0, 5))).toBe('Today, 12:05 am');
    expect(loggedAtLabel(new Date(2026, 8, 15, 13, 0))).toBe('Today, 1:00 pm');
  });

  it('a promise says when it reminds', () => {
    expect(promiseWhen('2026-09-17')).toBe('Remind me Thu, Sep 17');
  });

  it('a promise is reminded tomorrow at first, across a month', () => {
    expect(tomorrowOf(today)).toBe('2026-09-16');
    expect(tomorrowOf(new Date(2026, 8, 30))).toBe('2026-10-01');
  });

  it.each([
    ['NewJob', 'Chidi’s work anniversary'],
    ['Wedding', 'Chidi’s wedding anniversary'],
    ['NewBaby', 'Chidi’s baby’s birthday'],
    ['Moved', 'Chidi’s move anniversary'],
    ['Graduated', 'Chidi’s graduation anniversary'],
    ['SomethingElse', 'Ran his first marathon'],
  ] as const)('a yearly %s is titled “%s”', (kind, title) => {
    expect(yearlyTitle(kind, 'Chidi', ' Ran his first marathon ')).toBe(title);
  });

  it('the hint names the Milestones lead', () => {
    expect(yearlyHint('Chidi’s work anniversary', 'OnTheDay')).toBe(
      'Adds “Chidi’s work anniversary” to your dates, with a nudge on the day.',
    );
    expect(yearlyHint('Chidi’s work anniversary', 'OneWeekBefore')).toBe(
      'Adds “Chidi’s work anniversary” to your dates, with a nudge 1 week before.',
    );
  });
});
