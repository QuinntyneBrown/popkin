import { describe, expect, it } from 'vitest';
import { FeatureChoiceView } from '../../models/home';
import { featureOffText, featuresHint } from './feature-text';

describe('featuresHint', () => {
  it.each<[FeatureChoiceView[], string | undefined]>([
    [[], undefined],
    [
      [
        { feature: 'Plan', on: true },
        { feature: 'Schedules', on: true },
      ],
      'Plan and Schedules',
    ],
    [
      [
        { feature: 'Plan', on: true },
        { feature: 'Schedules', on: false },
      ],
      'Plan',
    ],
    [
      [
        { feature: 'Plan', on: false },
        { feature: 'Schedules', on: true },
      ],
      'Schedules',
    ],
    [
      [
        { feature: 'Plan', on: false },
        { feature: 'Schedules', on: false },
      ],
      'All off',
    ],
    [[{ feature: 'Schedules', on: true }], 'Schedules'],
    [[{ feature: 'Plan', on: false }], 'All off'],
  ])('names what is on in %j as %s', (choices, hint) => {
    expect(featuresHint(choices)).toBe(hint);
  });
});

describe('featureOffText', () => {
  it('says the Host can switch it back on when the Host switched it off', () => {
    expect(featureOffText('Plan', 'Host')).toBe(
      'Your host switched Plan off for this Popkin. Nothing is lost: it comes back as it was when they switch it on again in Popkin settings.',
    );
  });

  it('says the Host can ask Popkin when the admin app switched it off', () => {
    expect(featureOffText('Schedules', 'Popkin')).toBe(
      'Popkin has turned this feature off for now. Nothing is lost: it comes back as it was when the feature is on again. Your host can ask Popkin to find out more.',
    );
  });
});
