import { describe, expect, it } from 'vitest';
import { countLine, firstName, greeting, isContactId, longDay } from './contacts-text';

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

describe('firstName', () => {
  // L2-122 AC4
  it.each([
    ['Grace Adeyemi', 'Grace'],
    ['  Chidi  Okafor ', 'Chidi'],
    ['Femi', 'Femi'],
  ])('of "%s" is "%s"', (name, first) => expect(firstName(name)).toBe(first));
});

describe('isContactId', () => {
  it.each([
    ['566025c4-1a2b-4c3d-8e9f-0a1b2c3d4e5f', true],
    ['not-a-contact', false],
    ['566025c4', false],
  ])('"%s" is %s', (id, can) => expect(isContactId(id)).toBe(can));
});
