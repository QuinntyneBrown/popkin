import { describe, expect, it } from 'vitest';
import { PopkinHomeView } from '../../models/home';
import { PopkinSettingsView } from '../../models/popkin';
import { applySettings, lengthHint, stillEnds } from './popkin-settings';

const held = {
  id: 'p',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  length: 'TheWeekend',
  endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
  version: 3,
  memberCount: 14,
} as PopkinHomeView;

const change = (overrides: Partial<PopkinSettingsView> = {}): PopkinSettingsView => ({
  id: 'p',
  name: 'Campfire Nights',
  emoji: '🎉',
  colour: 'Plum',
  length: 'KeepItGoing',
  endsAt: null,
  version: 4,
  ...overrides,
});

describe('applySettings', () => {
  it('takes a newer change of the same Popkin, and keeps the rest', () => {
    expect(applySettings(held, change())).toEqual({
      ...held,
      name: 'Campfire Nights',
      emoji: '🎉',
      colour: 'Plum',
      length: 'KeepItGoing',
      endsAt: null,
      version: 4,
    });
  });

  it.each([
    ['no newer', change({ version: 3 })],
    ['older', change({ version: 2 })],
    ['of another Popkin', change({ id: 'q', version: 9 })],
  ])('drops a change %s', (_, dropped) => {
    expect(applySettings(held, dropped)).toBe(held);
  });

  it('has nothing to apply a change to before the Popkin is read', () => {
    expect(applySettings(null, change())).toBeNull();
  });
});

describe('lengthHint', () => {
  const now = new Date(2026, 8, 12, 12, 0);

  it.each([
    [new Date(2026, 8, 13, 18, 0).toISOString(), 'Wraps up Sun, 6 pm'],
    [new Date(2026, 8, 30, 18, 30).toISOString(), 'Wraps up 30 Sep, 6:30 pm'],
    [null, 'No end date'],
  ])('reads %s as "%s"', (endsAt, hint) => {
    expect(lengthHint(endsAt, now)).toBe(hint);
  });
});

describe('stillEnds', () => {
  const now = new Date(2026, 8, 12, 12, 0);

  it.each([
    [new Date(2026, 8, 13, 18, 0).toISOString(), 'It still wraps up Sunday at 6 pm.'],
    [new Date(2026, 8, 30, 18, 30).toISOString(), 'It still wraps up 30 Sep at 6:30 pm.'],
    [new Date(2027, 0, 2, 9, 0).toISOString(), 'It still wraps up 2 Jan 2027 at 9 am.'],
    [null, 'It still keeps going.'],
  ])('reads %s as "%s"', (endsAt, text) => {
    expect(stillEnds(endsAt, now)).toBe(text);
  });
});
