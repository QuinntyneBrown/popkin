import { describe, expect, it } from 'vitest';
import {
  callBannerText,
  callElapsed,
  callGrid,
  callSubtitle,
  directCallNote,
  directCallSubtitle,
  micWords,
  othersLine,
  shownOnCall,
} from './call-text';

const at = (seconds: number) => new Date(Date.UTC(2026, 8, 12, 12, 0, seconds));
const started = at(0).toISOString();

describe('callElapsed', () => {
  it.each([
    [0, '0:00'],
    [12, '0:12'],
    [60, '1:00'],
    [768, '12:48'],
    [3599, '59:59'],
    [3600, '1:00:00'],
    [3768, '1:02:48'],
  ])('%i seconds reads %s', (seconds, text) => {
    expect(callElapsed(started, at(seconds))).toBe(text);
  });

  it('never runs backwards when the device’s clock is behind the server’s', () => {
    expect(callElapsed(started, at(-5))).toBe('0:00');
  });
});

describe('callSubtitle', () => {
  it('says the member is alone', () => {
    expect(callSubtitle(1, '0:12')).toBe('Just you · 0:12');
  });
  it('counts everyone on the call', () => {
    expect(callSubtitle(6, '12:48')).toBe('6 on the call · 12:48');
  });
});

describe('a direct call (L2-030 AC8)', () => {
  it('says the member is alone until the other joins', () => {
    expect(directCallSubtitle(1, '0:12')).toBe('Just you · 0:12');
  });
  it('says it is the two of them', () => {
    expect(directCallSubtitle(2, '12:48')).toBe('Just the two of you · 12:48');
  });
  it('says who may join', () => {
    expect(directCallNote('Walt')).toBe('Only you and Walt can join this call.');
  });
});

describe('callBannerText', () => {
  it.each([
    [1, '1 on the call'],
    [6, '6 on the call'],
  ])('%i reads %s', (count, text) => expect(callBannerText(count)).toBe(text));
});

describe('callGrid', () => {
  it.each([
    [1, 'solo'],
    [2, 'pair'],
    [3, 'four'],
    [4, 'four'],
    [5, 'six'],
    [6, 'six'],
    [12, 'six'],
  ])('%i tiles are laid out as %s', (count, shape) => expect(callGrid(count)).toBe(shape));
});

describe('shownOnCall', () => {
  const people = (count: number) => Array.from({ length: count }, (_, at) => `m${at + 1}`);

  it('shows everyone up to twelve', () => {
    expect(shownOnCall(people(12), 'm4')).toEqual({ shown: people(12), more: 0 });
  });
  it('shows eleven and counts the rest from thirteen', () => {
    expect(shownOnCall(people(15), 'm4')).toEqual({ shown: people(11), more: 4 });
  });
  it('always shows the member, in place of the last shown', () => {
    const { shown, more } = shownOnCall(people(15), 'm14');
    expect(shown).toEqual([...people(10), 'm14']);
    expect(more).toBe(4);
  });
});

describe('micWords', () => {
  it('says who is speaking', () => expect(micWords(true, true)).toBe('Speaking'));
  it('says the microphone is on', () => expect(micWords(true, false)).toBe('Microphone on'));
  it('says muted, even if a sound was heard', () => expect(micWords(false, true)).toBe('Muted'));
});

describe('othersLine', () => {
  it.each([
    [14, 6, '8 others in Lakeside Weekend can join anytime.'],
    [7, 6, '1 other in Lakeside Weekend can join anytime.'],
    [6, 6, 'Everyone in Lakeside Weekend is on the call.'],
    [5, 6, 'Everyone in Lakeside Weekend is on the call.'],
  ])('%i members with %i on the call', (members, onCall, text) => {
    expect(othersLine('Lakeside Weekend', members, onCall)).toBe(text);
  });
});
