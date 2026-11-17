import { describe, expect, it } from 'vitest';
import { AdminLimits } from '../../../models/admin';
import { LimitsDraft, limitHelp, limitsSavedToast } from './limits-draft';

/** Limits as the API answers them with nothing changed (L2-176 AC1, AC3). */
const first: AdminLimits = {
  uploads: [],
  rates: [],
  sessions: [
    {
      limit: 'SessionDays',
      value: 365,
      defaultValue: 365,
      maxValue: 400,
      unit: 'days',
      changedAt: null,
      changedByName: null,
    },
  ],
};

const draft = () => new LimitsDraft(first);

describe('LimitsDraft (L2-176)', () => {
  it('starts at the saved values, valid, with nothing unsaved', () => {
    const d = draft();
    expect(d.value('SessionDays')).toBe('365');
    expect(d.valid).toBe(true);
    expect(d.unsaved).toBe(0);
    expect(d.changes).toEqual([]);
  });

  it.each([
    ['1', null],
    ['400', null],
    [' 30 ', null],
    ['0', 'Enter a whole number from 1 to 400.'],
    ['401', 'Enter a whole number from 1 to 400.'],
    ['-1', 'Enter a whole number from 1 to 400.'],
    ['7.5', 'Enter a whole number from 1 to 400.'],
    ['', 'Enter a whole number from 1 to 400.'],
    ['ten', 'Enter a whole number from 1 to 400.'],
  ])('says what is wrong with %j: %s', (value, error) => {
    expect(draft().with('SessionDays', value).error('SessionDays')).toBe(error);
  });

  it('asks for a whole number of 1 or more of a limit without a maximum', () => {
    const open = new LimitsDraft({
      ...first,
      sessions: [{ ...first.sessions[0], maxValue: null }],
    });
    expect(open.with('SessionDays', '0').error('SessionDays')).toBe(
      'Enter a whole number of 1 or more.',
    );
    expect(open.with('SessionDays', '9000').error('SessionDays')).toBeNull();
  });

  it('lists a change as "{limit}: {old} → {new} {unit}" and sends it', () => {
    const d = draft().with('SessionDays', '030');
    expect(d.unsaved).toBe(1);
    expect(d.changes).toEqual([{ name: 'Sign-in lasts', from: '365', to: '30', unit: 'days' }]);
    expect(d.request()).toEqual([{ limit: 'SessionDays', value: 30 }]);
  });

  it('counts nothing unsaved for the saved value typed again', () => {
    expect(draft().with('SessionDays', '30').with('SessionDays', '365').unsaved).toBe(0);
  });

  it('counts an invalid value as unsaved, and discarding brings back the saved one', () => {
    const d = draft().with('SessionDays', '');
    expect(d.unsaved).toBe(1);
    expect(d.valid).toBe(false);
    expect(d.discarded().value('SessionDays')).toBe('365');
  });
});

describe('limitHelp', () => {
  it('names what the limit counts and its default', () => {
    expect(limitHelp(first.sessions[0], true)).toBe(
      'Days since the person last used Popkin on the device · default 365 days',
    );
  });

  it('leaves the default out for an admin who cannot change it, as the mock does', () => {
    expect(limitHelp(first.sessions[0], false)).toBe(
      'Days since the person last used Popkin on the device',
    );
  });
});

describe('limitsSavedToast', () => {
  it('names one limit with "changes"', () => {
    expect(limitsSavedToast(['Sign-in lasts'])).toEqual([
      'Limits saved',
      'Sign-in lasts changes for everyone within a minute.',
    ]);
  });

  it('joins several with "and"', () => {
    expect(limitsSavedToast(['Messages', 'Sign-in codes', 'Sign-in lasts'])[1]).toBe(
      'Messages, Sign-in codes and Sign-in lasts change for everyone within a minute.',
    );
  });
});
