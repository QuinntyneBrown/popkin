import { describe, expect, it } from 'vitest';
import {
  actionOf,
  blocksOf,
  clockTime,
  countWord,
  draftOf,
  freeLabel,
  headlineOf,
  homeLineOf,
  legendOf,
  listOf,
  sentenceOf,
  subtitleOf,
  tintAt,
  timelineText,
} from './this-week-text';

const everyone = (from: string, last: string[] = []) => ({
  freeCount: 6,
  everyoneFreeFrom: from,
  lastOffShift: last,
  working: [],
});
const someWorking = (working: string[]) => ({
  freeCount: 6 - working.length,
  everyoneFreeFrom: null,
  lastOffShift: [],
  working,
});

describe('clockTime', () => {
  it.each([
    ['19:30', '7:30 pm'],
    ['17:00', '5 pm'],
    ['12:00', '12 pm'],
    ['09:00', '9 am'],
    ['08:30', '8:30 am'],
    ['00:00', '12 am'],
    ['24:00', 'midnight'],
  ])('%s is "%s"', (time, text) => expect(clockTime(time)).toBe(text));
});

describe('freeLabel', () => {
  it('is "{n}/{members} free" (L2-074 AC2)', () => expect(freeLabel(4, 6)).toBe('4/6 free'));
});

describe('countWord', () => {
  it.each([
    [2, 'two'],
    [6, 'six'],
    [12, 'twelve'],
    [13, '13'],
  ])('%s is "%s"', (n, word) => expect(countWord(n)).toBe(word));
});

describe('listOf', () => {
  it.each([
    [['Dev'], 'Dev'],
    [['Dev', 'Ellie'], 'Dev and Ellie'],
    [['Dev', 'Ellie', 'Sam'], 'Dev, Ellie and Sam'],
  ])('%j is "%s"', (names, text) => expect(listOf(names)).toBe(text));
});

describe('subtitleOf', () => {
  it('names the seven days (L2-074 AC1)', () =>
    expect(subtitleOf('2026-09-12')).toBe('Sep 12 – 18 · everyone’s working hours'));
});

describe('headlineOf', () => {
  // L2-074 AC3
  it('says when everyone is free from', () =>
    expect(headlineOf('Wednesday', everyone('19:30'), 6)).toEqual({
      text: 'Wednesday, everyone’s free from ',
      time: '7:30 pm.',
    }));

  // L2-074 AC4
  it('counts who is free when someone is working', () =>
    expect(headlineOf('Tuesday', someWorking(['Dev', 'Ellie', 'Sam']), 6)).toEqual({
      text: 'Tuesday, 3 of 6 are free in the evening.',
      time: null,
    }));

  it('says "is" for one', () =>
    expect(headlineOf('Tuesday', { ...someWorking(['Dev']), freeCount: 1 }, 2).text).toBe(
      'Tuesday, 1 of 2 is free in the evening.',
    ));
});

describe('sentenceOf', () => {
  it('names the last off shift, and says when it is the only evening everyone is free', () =>
    expect(sentenceOf(everyone('19:30', ['Ellie']), 6, 1)).toBe(
      'Ellie is the last off shift. The only evening this week all six of you are around.',
    ));

  it('names several last off shift, on one of several evenings everyone is free', () =>
    expect(sentenceOf(everyone('19:30', ['Ellie', 'Walt']), 6, 3)).toBe(
      'Ellie and Walt are the last off shift.',
    ));

  it('says nobody works past 5 pm', () =>
    expect(sentenceOf(everyone('17:00'), 6, 2)).toBe('Nobody works past 5 pm.'));

  it('names who is working, and the one evening everyone is free', () =>
    expect(sentenceOf(someWorking(['Dev', 'Ellie', 'Sam']), 6, 1, 'Wednesday')).toBe(
      'Dev, Ellie and Sam are working. Wednesday is the one evening everyone is free.',
    ));

  it('says "is working" for one, and nothing more when no evening or several are free', () => {
    expect(sentenceOf(someWorking(['Dev']), 6, 0)).toBe('Dev is working.');
    expect(sentenceOf(someWorking(['Dev']), 6, 2)).toBe('Dev is working.');
  });
});

describe('actionOf', () => {
  // L2-074 AC7
  it('plans dinner when everyone is free, and asks anyway when not', () => {
    expect(actionOf(everyone('19:30'))).toEqual({
      label: 'Plan dinner in chat',
      variant: 'popkin',
    });
    expect(actionOf(someWorking(['Dev']))).toEqual({
      label: 'Ask in chat anyway',
      variant: 'secondary',
    });
  });
});

describe('draftOf', () => {
  // L2-074 AC7
  it('drafts dinner for everyone', () =>
    expect(draftOf('Wednesday', everyone('19:30'), [])).toBe(
      'Everyone’s free Wednesday from 7:30 pm. Dinner to catch up on the plan? Ideas for where?',
    ));

  it('asks those who are free', () =>
    expect(draftOf('Tuesday', someWorking(['Dev']), ['Mara', 'Walt', 'Priya'])).toBe(
      'Mara, Walt and Priya: free Tuesday evening? Could be a small dinner to catch up on the plan.',
    ));
});

describe('blocksOf', () => {
  // L2-074 AC5: noon to midnight.
  it('places each stretch on the noon-to-midnight track', () =>
    expect(
      blocksOf([
        { start: '14:00', end: '22:00' },
        { start: '19:00', end: '24:00' },
      ]),
    ).toEqual([
      { left: (2 / 12) * 100, width: (8 / 12) * 100, label: 'Working till 10 pm' },
      { left: (7 / 12) * 100, width: (5 / 12) * 100, label: 'Working' },
    ]));

  it('clips a stretch that starts in the morning, and leaves out one that ends by noon', () =>
    expect(
      blocksOf([
        { start: '06:00', end: '10:00' },
        { start: '09:00', end: '17:30' },
      ]),
    ).toEqual([{ left: 0, width: (5.5 / 12) * 100, label: 'Working till 5:30 pm' }]));
});

describe('tintAt', () => {
  it('starts the tint at the time everyone is free', () => expect(tintAt('19:30')).toBe(62.5));
});

describe('timelineText', () => {
  // L2-074 AC6
  it('gives each member’s working stretches as text', () =>
    expect(
      timelineText([
        { name: 'Mara', stretches: [{ start: '09:00', end: '17:30' }] },
        { name: 'Walt', stretches: [] },
        {
          name: 'Ellie',
          stretches: [
            { start: '06:00', end: '10:00' },
            { start: '19:00', end: '24:00' },
          ],
        },
      ]),
    ).toBe(
      'Mara: working 9 am to 5:30 pm; Walt: free all afternoon and evening; Ellie: working 6 am to 10 am and 7 pm to midnight.',
    ));
});

describe('legendOf', () => {
  // L2-074 AC5
  it('names "At work", and when everyone is free, from when', () => {
    expect(legendOf(everyone('19:30'), 6)).toEqual({
      allFree: 'All six free from ',
      time: '7:30 pm',
    });
    expect(legendOf(someWorking(['Dev']), 6)).toEqual({ allFree: null, time: null });
  });
});

describe('homeLineOf', () => {
  // L2-075 AC2: the home's Schedule section.
  it.each([
    [
      { hasHours: true, day: '2026-09-16', everyoneFreeFrom: '19:30' },
      'Everyone’s free Wednesday from 7:30 pm',
    ],
    [
      { hasHours: true, day: '2026-09-13', everyoneFreeFrom: '17:00' },
      'Everyone’s free Sunday from 5 pm',
    ],
    [
      { hasHours: true, day: null, everyoneFreeFrom: null },
      'No evening this week is free for everyone',
    ],
  ])('%j reads %s', (summary, line) => expect(homeLineOf(summary)).toBe(line));
});
