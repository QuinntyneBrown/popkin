import { describe, expect, it } from 'vitest';
import {
  announcement,
  dayLabel,
  messageLine,
  messageTime,
  noteParts,
  othersHere,
  threadSub,
} from './thread-text';

// Saturday 12 September 2026, noon on the device: the day the mocks show.
const now = new Date(2026, 8, 12, 12, 0);

describe('dayLabel (L2-021 AC4)', () => {
  it.each([
    [new Date(2026, 8, 12, 0, 0), 'Today'],
    [new Date(2026, 8, 12, 23, 59), 'Today'],
    [new Date(2026, 8, 11, 23, 59), 'Yesterday'],
    [new Date(2026, 8, 10, 9, 0), 'Thursday'],
    [new Date(2026, 8, 6, 9, 0), 'Sunday'],
    [new Date(2026, 8, 5, 9, 0), '5 Sep'],
    [new Date(2025, 11, 31, 9, 0), '31 Dec 2025'],
  ])('%s reads "%s"', (sentAt, label) => {
    expect(dayLabel(sentAt, now)).toBe(label);
  });
});

describe('messageTime', () => {
  it.each([
    [new Date(2026, 8, 12, 9, 24), '9:24'],
    [new Date(2026, 8, 12, 0, 5), '12:05'],
    [new Date(2026, 8, 12, 12, 0), '12:00'],
    [new Date(2026, 8, 12, 21, 7), '9:07'],
  ])('%s reads "%s"', (sentAt, time) => {
    expect(messageTime(sentAt)).toBe(time);
  });
});

describe('threadSub (L2-021 AC1)', () => {
  it.each([
    [1, 1, 'Just you so far'],
    [1, 0, 'Just you so far'],
    [2, 1, '2 members · 1 here now'],
    [14, 5, '14 members · 5 here now'],
    [14, 0, '14 members'],
  ])('%i members with %i here reads "%s"', (members, here, text) => {
    expect(threadSub(members, here)).toBe(text);
  });
});

describe('othersHere', () => {
  it.each([
    [14, 5, 'and 9 others in this Popkin'],
    [6, 5, 'and 1 other in this Popkin'],
    [5, 5, null],
    [3, 5, null],
  ])('%i members with %i listed reads %s', (members, listed, text) => {
    expect(othersHere(members, listed)).toBe(text);
  });
});

describe('announcement (L2-027 AC6)', () => {
  it('names the sender before the text', () => {
    expect(announcement('Walt', 'Pancakes at 8:30')).toBe('Walt: Pancakes at 8:30');
  });
});

describe('messageLine (L2-026)', () => {
  const photo = { id: 'ph', url: '/f', width: 800, height: 600 };
  it.each([
    ['text alone', { text: 'Dock', photo: null }, 'Dock'],
    ['a photo with text', { text: 'Dock', photo }, 'Dock'],
    ['a photo alone', { text: '', photo }, 'Photo'],
    ['nothing', { text: '', photo: null }, ''],
    ['a removed photo alone', { text: '', photo: null, photoRemoved: true }, 'Photo removed'],
    ['a removed photo with text', { text: 'Dock', photo: null, photoRemoved: true }, 'Dock'],
  ])('reads %s as its line', (_case, message, line) => {
    expect(messageLine(message)).toBe(line);
  });
});

describe('noteParts', () => {
  it('sets the name of the person who popped in apart from the rest', () => {
    expect(noteParts('Joel Park popped in. Say hi! 👋')).toEqual({
      name: 'Joel Park',
      text: ' popped in. Say hi! 👋',
    });
  });

  it('keeps a note it does not know whole', () => {
    expect(noteParts('The Popkin wrapped up.')).toEqual({
      name: '',
      text: 'The Popkin wrapped up.',
    });
  });
});
