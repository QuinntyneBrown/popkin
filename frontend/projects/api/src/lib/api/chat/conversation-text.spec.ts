import { describe, expect, it } from 'vitest';
import { directLatest, matchesMember, rowTime } from './conversation-text';

const at = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute);
/** Saturday 12 September 2026 at noon, the mocks' day. */
const now = at(9, 12);

describe('the time of a conversation', () => {
  it.each([
    ['earlier today', at(9, 12, 9, 41), '9:41'],
    ['a moment ago', at(9, 12, 11, 59), '11:59'],
    ['yesterday', at(9, 11, 20, 5), 'Fri'],
    ['six days ago', at(9, 6, 23, 0), 'Sun'],
    ['a week ago, the same weekday', at(9, 5, 9, 0), '5 Sep'],
    ['last month', at(8, 30), '30 Aug'],
    ['another year', at(12, 31, 12, 0, 2025), '31 Dec 2025'],
  ])('reads %s', (_, sentAt, text) => {
    expect(rowTime(sentAt, now)).toBe(text);
  });
});

describe('the latest line of a conversation', () => {
  it('says "You:" before the member’s own message in a direct message', () => {
    expect(directLatest({ text: 'thanks for the paddles!', isMine: true })).toBe(
      'You: thanks for the paddles!',
    );
  });

  it('is the other member’s message as written', () => {
    expect(directLatest({ text: 'See you at the dock 💛', isMine: false })).toBe(
      'See you at the dock 💛',
    );
  });
});

describe('searching the members', () => {
  it.each([
    ['', 'Walt Brennan', true],
    ['   ', 'Walt Brennan', true],
    ['walt', 'Walt Brennan', true],
    ['BREN', 'Walt Brennan', true],
    ['t b', 'Walt Brennan', true],
    ['tomas', 'Tomás Rivera', true],
    ['Tomás', 'Tomas Rivera', true],
    ['  ruth ', 'Ruth Lindqvist', true],
    ['zed', 'Walt Brennan', false],
    ['waltz', 'Walt Brennan', false],
  ])('"%s" against %s', (query, name, matches) => {
    expect(matchesMember(name, query)).toBe(matches);
  });
});
