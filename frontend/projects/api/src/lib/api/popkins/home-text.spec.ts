import { describe, expect, it } from 'vitest';
import {
  experiencesMeta,
  memberName,
  membersLabel,
  newLabel,
  photosMeta,
  ratingLabel,
  timeLeftLine,
  wrapsUp,
} from './home-text';

const noon = new Date(2026, 8, 12, 12, 0);

describe('wrapsUp', () => {
  it.each([
    [new Date(2026, 8, 13, 18, 0), 'Wraps up Sun, 6 pm'],
    [new Date(2026, 8, 13, 18, 30), 'Wraps up Sun, 6:30 pm'],
    [new Date(2026, 8, 12, 23, 59), 'Wraps up Sat, 11:59 pm'],
    [new Date(2026, 8, 13, 0, 0), 'Wraps up Sun, 12 am'],
    [new Date(2026, 8, 18, 9, 0), 'Wraps up Fri, 9 am'],
    // A week or more away, the weekday alone would not say which one.
    [new Date(2026, 8, 19, 12, 0), 'Wraps up 19 Sep, 12 pm'],
    [new Date(2027, 0, 2, 18, 0), 'Wraps up 2 Jan 2027, 6 pm'],
  ])('reads %s as "%s"', (end, text) => {
    expect(wrapsUp(end, noon)).toBe(text);
  });
});

describe('timeLeftLine', () => {
  it('joins the time left and when it wraps up', () => {
    expect(timeLeftLine('2026-09-13T18:00:00', noon)).toBe('1 day 6 hrs left · Wraps up Sun, 6 pm');
  });

  it('is nothing for a Popkin that keeps going', () => {
    expect(timeLeftLine(null, noon)).toBeNull();
  });

  it('is nothing once the end has passed', () => {
    expect(timeLeftLine('2026-09-12T11:59:00', noon)).toBeNull();
  });
});

describe('the counts of the home', () => {
  it.each([
    [1, '1 member'],
    [14, '14 members'],
  ])('%i reads "%s"', (n, text) => expect(membersLabel(n)).toBe(text));

  it.each([
    [1, '1 photo'],
    [48, '48 photos'],
  ])('%i reads "%s"', (n, text) => expect(photosMeta(n)).toBe(text));

  it('says how many experiences are shared', () => expect(experiencesMeta(4)).toBe('4 shared'));
  it('says how many messages are new', () => expect(newLabel(3)).toBe('3 new'));

  it.each([
    [4.8, 11, '4.8 · 11 ratings'],
    [5, 1, '5.0 · 1 rating'],
    [4.25, 8, '4.3 · 8 ratings'],
  ])('%d from %i reads "%s"', (average, n, text) => expect(ratingLabel(average, n)).toBe(text));
});

describe('memberName', () => {
  it('marks the viewer', () => expect(memberName('Mara Okafor', true)).toBe('Mara Okafor (you)'));
  it('leaves the others', () => expect(memberName('Walt Brennan', false)).toBe('Walt Brennan'));
});
