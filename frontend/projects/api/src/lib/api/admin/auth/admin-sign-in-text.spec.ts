import { describe, expect, it } from 'vitest';
import { emailProblem, lockedText, mismatchText } from './admin-sign-in-text';

describe('mismatchText', () => {
  it.each([
    [2, 'That code doesn’t match. 2 tries left before the console locks for 15 minutes.'],
    [1, 'That code doesn’t match. 1 try left before the console locks for 15 minutes.'],
  ])('counts %i tries left', (left, text) => {
    expect(mismatchText(left)).toBe(text);
  });
});

describe('lockedText', () => {
  it.each([
    [
      '2026-07-14T09:57:00Z',
      'Europe/London',
      'Try again at 10:57, or ask an Owner to check your account.',
    ],
    [
      '2026-01-14T09:57:00Z',
      'Europe/London',
      'Try again at 09:57, or ask an Owner to check your account.',
    ],
    [
      '2026-07-14T09:57:00Z',
      'America/New_York',
      'Try again at 05:57, or ask an Owner to check your account.',
    ],
  ])('names %s in %s', (until, timeZone, text) => {
    expect(lockedText(until, timeZone)).toBe(text);
  });

  it('says to try later when the time is not known', () => {
    expect(lockedText(undefined, 'Europe/London')).toBe(
      'Try again in 15 minutes, or ask an Owner to check your account.',
    );
  });
});

describe('emailProblem', () => {
  it.each(['lena@popkin.app', ' Lena@Popkin.app ', 'mara@hey.com'])('takes %s', (typed) => {
    expect(emailProblem(typed)).toBeNull();
  });

  it.each([
    ['lena@popkin', 'Staff email is missing its ending'],
    ['lena', 'Staff email is missing its ending'],
    ['', 'Enter your staff email'],
    ['   ', 'Enter your staff email'],
  ])('refuses %j', (typed, summary) => {
    expect(emailProblem(typed)).toEqual({
      error: 'Enter a whole email address, like name@popkin.app.',
      summary,
    });
  });
});
