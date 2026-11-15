import { describe, expect, it } from 'vitest';
import { countLine, greeting, longDay } from './contacts-text';

describe('countLine', () => {
  // L2-121 AC3
  it.each([
    [0, 'Only you can see them'],
    [1, '1 person · only you'],
    [13, '13 people · only you'],
  ])('%i reads "%s"', (people, line) => expect(countLine(people)).toBe(line));
});

describe('greeting', () => {
  // L2-125 AC1: by the hour on the device.
  it.each([
    [0, 0, 'Morning, Mara'],
    [8, 40, 'Morning, Mara'],
    [11, 59, 'Morning, Mara'],
    [12, 0, 'Afternoon, Mara'],
    [17, 59, 'Afternoon, Mara'],
    [18, 0, 'Evening, Mara'],
    [23, 59, 'Evening, Mara'],
  ])('at %i:%i it reads "%s"', (hour, minute, text) =>
    expect(greeting('Mara Okafor', new Date(2026, 8, 15, hour, minute))).toBe(text),
  );

  it('uses the whole name when it is one word', () =>
    expect(greeting('Mara', new Date(2026, 8, 15, 9))).toBe('Morning, Mara'));
});

describe('longDay', () => {
  it.each([
    [new Date(2026, 8, 15), 'Tuesday, 15 September'],
    [new Date(2027, 0, 1), 'Friday, 1 January'],
  ])('%s reads "%s"', (day, text) => expect(longDay(day)).toBe(text));
});
