import { FeatureChoiceView, PopkinFeature } from '../../models/home';

/** What each feature a Popkin may have is called and does, beside its switch (L2-152 AC1). */
export const FEATURE_TEXT: Record<
  PopkinFeature,
  { title: string; text: string; icon: 'board' | 'calendar' }
> = {
  Plan: {
    title: 'Plan',
    text: 'A board of stories to share out the jobs, and a burn-down of what’s left.',
    icon: 'board',
  },
  Schedules: {
    title: 'Schedules',
    text: 'Everyone’s time off and hours, and the days of the event.',
    icon: 'calendar',
  },
};

/** The line above the switches, on "What should it have?" and in "Features". */
export const ALWAYS_THERE = 'Chat, calls, photos and experiences are always there.';

/**
 * The hint under "Features" in Popkin settings: the features switched on, or "All off"
 * (L2-153 AC1). Undefined when the admin app offers none, which hides the item.
 */
export function featuresHint(choices: readonly FeatureChoiceView[]): string | undefined {
  if (choices.length === 0) return undefined;
  const on = choices.filter((c) => c.on).map((c) => c.feature);
  return on.length === 0 ? 'All off' : on.join(' and ');
}

/**
 * The words of a feature's screen while it is off (L2-077 AC2): who can switch it on again
 * depends on who switched it off.
 */
export function featureOffText(feature: PopkinFeature, switchedOffBy: 'Host' | 'Popkin'): string {
  return switchedOffBy === 'Host'
    ? `Your host switched ${feature} off for this Popkin. Nothing is lost: it comes back as it was when they switch it on again in Popkin settings.`
    : 'Popkin has turned this feature off for now. Nothing is lost: it comes back as it was when the feature is on again. Your host can ask Popkin to find out more.';
}
