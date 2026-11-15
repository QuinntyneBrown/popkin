import { describe, expect, it } from 'vitest';
import { AdminFeature } from '../../../models/admin';
import {
  addPopkinNotes,
  modeDialogText,
  modeSavedToast,
  reachText,
  sinceText,
} from './features-text';

const feature = (over: Partial<AdminFeature>): AdminFeature => ({
  feature: 'Schedules',
  mode: 'Everyone',
  livePopkins: 3112,
  chosen: [],
  changedAt: null,
  changedByName: null,
  ...over,
});

const popkin = (name: string) => ({ popkinId: name, name, emoji: '🏕️', colour: 'Teal' });

describe('reachText (L2-076 AC1)', () => {
  it.each([
    [feature({ mode: 'Everyone' }), 'On in all 3,112 live Popkins.'],
    [feature({ mode: 'Everyone', livePopkins: 1 }), 'On in the 1 live Popkin.'],
    [
      feature({ mode: 'Chosen', chosen: [popkin('a'), popkin('b'), popkin('c')] }),
      'On in 3 chosen Popkins only.',
    ],
    [feature({ mode: 'Chosen', chosen: [popkin('a')] }), 'On in 1 chosen Popkin only.'],
    [feature({ mode: 'Off' }), 'Hidden in every Popkin.'],
  ])('says where it is on', (given, expected) => {
    expect(reachText(given)).toBe(expected);
  });
});

describe('sinceText (L2-076 AC1)', () => {
  const now = new Date('2026-07-14T12:00:00+01:00');

  it('gives the time of a change made today, and the day alone of an older one', () => {
    expect(
      sinceText(
        feature({
          mode: 'Chosen',
          changedAt: '2026-07-14T10:21:00+01:00',
          changedByName: 'Lena Fischer',
        }),
        now,
        'Europe/London',
      ),
    ).toBe('Chosen Popkins since 14 Jul, 10:21 by Lena Fischer');
    expect(
      sinceText(
        feature({
          mode: 'Everyone',
          changedAt: '2026-07-01T09:00:00+01:00',
          changedByName: 'Lena Fischer',
        }),
        now,
        'Europe/London',
      ),
    ).toBe('On for everyone since 1 Jul by Lena Fischer');
    expect(
      sinceText(
        feature({
          mode: 'Off',
          changedAt: '2026-07-14T10:44:00+01:00',
          changedByName: 'Lena Fischer',
        }),
        now,
        'Europe/London',
      ),
    ).toBe('Off since 14 Jul, 10:44 by Lena Fischer');
  });

  it('says nothing of a switch nobody has set', () => {
    expect(sinceText(feature({ mode: 'Off' }), now, 'Europe/London')).toBeNull();
  });
});

describe('modeDialogText (L2-076 AC2–AC4)', () => {
  it('asks before turning a feature off, saying what is kept', () => {
    expect(modeDialogText('Schedules', 'Off', [])).toEqual({
      heading: 'Turn Schedules off for everyone?',
      description:
        'The Schedule tab disappears from every Popkin within a minute. Nothing is deleted: everyone’s time off and hours come back as they were when you turn it on again.',
    });
  });

  it('asks before turning a feature on for everyone', () => {
    expect(modeDialogText('Schedules', 'Everyone', [])).toEqual({
      heading: 'Turn Schedules on for everyone?',
      description: 'Every live Popkin gets the Schedule tab within a minute.',
    });
  });

  it('names the Popkins that keep a feature limited to chosen ones', () => {
    expect(
      modeDialogText('Plan', 'Chosen', ['Lakeside Weekend', 'U10 Hornets Parents']).description,
    ).toBe(
      'Only the 2 Popkins you pick keep Plan: Lakeside Weekend and U10 Hornets Parents. Everyone else stops seeing the Plan tab within a minute; nothing is deleted.',
    );
    expect(modeDialogText('Plan', 'Chosen', ['Lakeside Weekend']).description).toContain(
      'Only the 1 Popkin you pick keeps Plan: Lakeside Weekend.',
    );
    expect(modeDialogText('Plan', 'Chosen', []).description).toContain(
      'No Popkin is chosen yet, so Plan is on in no Popkin until you add one.',
    );
  });
});

describe('modeSavedToast (L2-076 AC7)', () => {
  it('confirms each change', () => {
    expect(modeSavedToast('Schedules', 'Off')).toEqual([
      'Schedules is off',
      'The Schedule tab is gone from every Popkin. Nothing was deleted.',
    ]);
    expect(modeSavedToast('Schedules', 'Everyone')).toEqual([
      'Schedules is on for everyone',
      'Every live Popkin gets the Schedule tab within a minute.',
    ]);
  });
});

describe('addPopkinNotes (L2-076 AC6)', () => {
  it('marks a Popkin that already has the feature, and says when nothing matches', () => {
    expect(
      addPopkinNotes('Schedules', 'lake', [{ name: 'Lakeside Weekend', alreadyOn: true }]),
    ).toEqual(['Lakeside Weekend already has Schedules.']);
    expect(addPopkinNotes('Schedules', 'zzz', [])).toEqual([
      'No live Popkin matches “zzz”. Wrapped-up Popkins can’t be added.',
    ]);
    expect(addPopkinNotes('Schedules', ' ', [])).toEqual([]);
  });
});
