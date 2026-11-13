import { describe, expect, it } from 'vitest';
import {
  albumLine,
  count,
  exportProgress,
  peopleLine,
  photosGo,
  ranDates,
  recapPreviewLine,
  statLabel,
  topRatedBy,
  wrapUpLede,
  wrapUpWarning,
  wrappedUpOn,
} from './wrap-up-text';

const at = (month: number, day: number, hour = 12, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute);
const iso = (date: Date) => date.toISOString();

describe('the words of wrapping up', () => {
  it.each([
    [0, '0'],
    [48, '48'],
    [1286, '1,286'],
    [1234567, '1,234,567'],
  ])('counts %i as %s', (value, text) => {
    expect(count(value)).toBe(text);
  });

  it.each([
    ['a weekend', at(9, 11), at(9, 13), 'Fri 11 – Sun 13 Sep'],
    ['one day', at(9, 13, 9), at(9, 13, 18), 'Sun 13 Sep'],
    ['two months', at(8, 28), at(9, 1), 'Fri 28 Aug – Tue 1 Sep'],
    ['two years', at(12, 30, 12, 0, 2025), at(1, 2), 'Tue 30 Dec 2025 – Fri 2 Jan 2026'],
  ])('gives the dates of %s', (_, from, to, text) => {
    expect(ranDates(iso(from), iso(to))).toBe(text);
  });

  it.each([
    [1, '1 person showed up'],
    [14, '14 people showed up'],
    [1200, '1,200 people showed up'],
  ])('says %i showed up', (people, text) => {
    expect(peopleLine(people)).toBe(text);
  });

  it.each([
    ['messages', 1, 'message sent'],
    ['messages', 1286, 'messages sent'],
    ['photos', 1, 'photo shared'],
    ['photos', 0, 'photos shared'],
  ] as const)('labels %s for %i', (what, value, text) => {
    expect(statLabel(what, value)).toBe(text);
  });

  it('says who shared the top-rated moment', () => {
    expect(topRatedBy('Mara')).toBe('shared by Mara');
  });

  it.each([
    ['twelve days ahead', at(9, 25, 12), 'Photos go in 12 days.'],
    ['a day and a bit ahead', at(9, 14, 20), 'Photos go in 2 days.'],
    ['a day ahead', at(9, 14, 12), 'Photos go in 1 day.'],
    ['hours ahead', at(9, 13, 20), 'Photos go today.'],
  ])('warns when the photos go %s', (_, removeAt, lead) => {
    expect(photosGo(iso(removeAt), at(9, 13, 12))).toEqual({
      lead,
      text: 'Save the album to keep them.',
    });
  });

  it('has no warning for an album that is kept, or once the time has passed', () => {
    expect(photosGo(null, at(9, 13))).toBeNull();
    expect(photosGo(iso(at(9, 12)), at(9, 13))).toBeNull();
  });

  it('says how far the album is', () => {
    expect(exportProgress(12, 48)).toBe('Preparing 12 of 48');
    expect(exportProgress(1200, 4800)).toBe('Preparing 1,200 of 4,800');
  });

  it('says when a Popkin wrapped up', () => {
    expect(wrappedUpOn(iso(at(9, 13)))).toBe('Wrapped up Sun 13 Sep');
  });

  describe('the last hour', () => {
    const end = at(9, 13, 18);
    it.each([
      ['more than an hour', at(9, 13, 16, 59), null],
      ['an hour', at(9, 13, 17, 0), '1 hour left.'],
      ['under an hour', at(9, 13, 17, 18), '42 min left.'],
      ['under a minute', at(9, 13, 17, 59, 2026), '1 min left.'],
      ['no time', at(9, 13, 18), null],
    ])('with %s left', (_, now, lead) => {
      const warning = wrapUpWarning('Lakeside Weekend', iso(end), now);
      expect(warning?.lead ?? null).toBe(lead);
      if (warning) expect(warning.text).toBe('Lakeside Weekend wraps up at 6 pm.');
    });

    it('is not for a Popkin that keeps going', () => {
      expect(wrapUpWarning('Thursday Night Group', null, at(9, 13))).toBeNull();
    });

    it('gives the minutes of the end', () => {
      expect(wrapUpWarning('Lakeside', iso(at(9, 13, 18, 30)), at(9, 13, 18))?.text).toBe(
        'Lakeside wraps up at 6:30 pm.',
      );
    });
  });

  describe('the wrap-up screen', () => {
    it.each([
      [1, 'Every good Popkin ends. Here’s what happens next.'],
      [2, 'Every good Popkin ends. Here’s what happens next for both of you.'],
      [14, 'Every good Popkin ends. Here’s what happens next for all 14 of you.'],
    ])('speaks to %i', (members, text) => {
      expect(wrapUpLede(members)).toBe(text);
    });

    it.each([
      [48, 1286, 'The recap everyone gets · 48 photos, 1,286 messages'],
      [1, 1, 'The recap everyone gets · 1 photo, 1 message'],
      [0, 0, 'The recap everyone gets · 0 photos, 0 messages'],
    ])('previews the recap of %i photos and %i messages', (photos, messages, text) => {
      expect(recapPreviewLine(photos, messages)).toBe(text);
    });

    it('says what the switch means', () => {
      expect(albumLine(true)).toBe('Members can keep browsing and saving');
      expect(albumLine(false)).toBe('Photos are removed after 30 days');
    });
  });
});
