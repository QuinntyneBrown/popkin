import { describe, expect, it } from 'vitest';
import {
  accountLabel,
  cardTimeLeft,
  latestLine,
  unreadBadge,
  unreadLabel,
  wrappedLine,
} from './my-popkins-text';

const now = new Date(2026, 8, 12, 12, 0);
const at = (...parts: [number, number, number, number?, number?]) =>
  new Date(...parts).toISOString();

describe('cardTimeLeft', () => {
  it.each([
    [null, 'Ongoing'],
    [at(2026, 8, 13, 18, 0), '1 day 6 hrs left'],
    [at(2026, 8, 12, 12, 42), '42 min left'],
    [at(2026, 8, 19, 11, 59), '6 days 23 hrs left'],
    [at(2026, 8, 19, 12, 0), 'Until Sep 19'],
    [at(2026, 10, 30, 18, 0), 'Until Nov 30'],
    [at(2027, 0, 5, 18, 0), 'Until Jan 5, 2027'],
    [at(2026, 8, 12, 11, 0), 'Wrapping up'],
  ])('says %s as %s', (endsAt, text) => {
    expect(cardTimeLeft(endsAt, now)).toBe(text);
  });
});

describe('the unread badge', () => {
  it.each([
    [0, null, null],
    [1, '1', '1 unread message'],
    [3, '3', '3 unread messages'],
    [99, '99', '99 unread messages'],
    [100, '99+', 'More than 99 unread messages'],
    [4000, '99+', 'More than 99 unread messages'],
  ])('shows %i as %s', (count, badge, label) => {
    expect(unreadBadge(count)).toBe(badge);
    expect(unreadLabel(count)).toBe(label);
  });
});

describe('latestLine', () => {
  it('names the sender before the message', () => {
    expect(latestLine({ firstName: 'Mara', text: 'last call for the canoe sign-up' })).toBe(
      'Mara: last call for the canoe sign-up',
    );
  });

  it('says so when nobody has written', () => {
    expect(latestLine(null)).toBe('No messages yet');
  });
});

describe('wrappedLine', () => {
  it.each([
    [at(2026, 2, 8), 48, 312, 'Wrapped Mar 8 · 48 people · 312 photos'],
    [at(2026, 5, 21), 1, 1, 'Wrapped Jun 21 · 1 person · 1 photo'],
    [at(2025, 8, 14), 12, 0, 'Wrapped Sep 14, 2025 · 12 people · 0 photos'],
  ])('reads %s', (wrappedUpAt, people, photos, text) => {
    expect(wrappedLine(wrappedUpAt, people, photos, now)).toBe(text);
  });
});

describe('accountLabel', () => {
  it('names whose account the avatar opens', () => {
    expect(accountLabel('Mara Okafor')).toBe('Your account, Mara Okafor');
  });
});
