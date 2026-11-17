import { AdminFeature, FeatureMode } from '../../../models/admin';
import { PopkinFeature } from '../../../models/home';

/** What each feature is, on its panel (L2-076 AC1). */
export const FEATURE_ABOUT: Record<PopkinFeature, string> = {
  Plan: 'The shared board and burn-down for a Popkin’s to-dos.',
  Schedules: 'Time off and a week view of when members are free.',
};

/** The name of the feature's tab in a Popkin: Schedules shows as "Schedule". */
export const FEATURE_TAB: Record<PopkinFeature, string> = {
  Plan: 'Plan',
  Schedules: 'Schedule',
};

/** What turning a feature off keeps, said in its dialog (L2-076 AC2, L2-077 AC5). */
const KEPT: Record<PopkinFeature, string> = {
  Plan: 'every story and the burn-down come back as they were when you turn it on again.',
  Schedules: 'everyone’s time off and hours come back as they were when you turn it on again.',
};

const SETTING: Record<FeatureMode, string> = {
  Off: 'Off',
  Chosen: 'Chosen Popkins',
  Everyone: 'On for everyone',
};

const count = (n: number) => new Intl.NumberFormat('en-GB').format(n);
const popkins = (n: number) => `${count(n)} ${n === 1 ? 'Popkin' : 'Popkins'}`;

/** "On in all 3,112 live Popkins.", "On in 3 chosen Popkins only." or "Hidden in every Popkin." */
export function reachText(feature: AdminFeature): string {
  switch (feature.mode) {
    case 'Everyone':
      return feature.livePopkins === 1
        ? 'On in the 1 live Popkin.'
        : `On in all ${count(feature.livePopkins)} live Popkins.`;
    case 'Chosen':
      return `On in ${count(feature.chosen.length)} chosen ${feature.chosen.length === 1 ? 'Popkin' : 'Popkins'} only.`;
    default:
      return 'Hidden in every Popkin.';
  }
}

/**
 * "Chosen Popkins since 14 Jul, 10:21 by Lena Fischer": the time is given for a change made
 * today, the day alone for an older one; null for a switch nobody has set.
 */
export function sinceText(feature: AdminFeature, now: Date, timeZone: string): string | null {
  if (!feature.changedAt) return null;
  const at = new Date(feature.changedAt);
  const day = (d: Date) =>
    new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(at);
  const when = day(at) === day(now) ? `${day(at)}, ${time}` : day(at);
  return `${SETTING[feature.mode]} since ${when} by ${feature.changedByName ?? 'Popkin'}`;
}

/** "Lakeside Weekend", "Lakeside Weekend and U10 Hornets Parents", "A, B and C". */
function names(list: readonly string[]): string {
  if (list.length <= 1) return list.join('');
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

/** The heading and sentence of the dialog for choosing `mode` (L2-076 AC2–AC4). */
export function modeDialogText(
  feature: PopkinFeature,
  mode: FeatureMode,
  chosen: readonly string[],
): { heading: string; description: string } {
  const tab = FEATURE_TAB[feature];
  switch (mode) {
    case 'Off':
      return {
        heading: `Turn ${feature} off for everyone?`,
        description: `The ${tab} tab disappears from every Popkin within a minute. Nothing is deleted: ${KEPT[feature]}`,
      };
    case 'Everyone':
      return {
        heading: `Turn ${feature} on for everyone?`,
        description: `Every live Popkin gets the ${tab} tab within a minute.`,
      };
    default: {
      const rest = `Everyone else stops seeing the ${tab} tab within a minute; nothing is deleted.`;
      if (chosen.length === 0) {
        return {
          heading: `Limit ${feature} to chosen Popkins?`,
          description: `No Popkin is chosen yet, so ${feature} is on in no Popkin until you add one. ${rest}`,
        };
      }
      return {
        heading: `Limit ${feature} to chosen Popkins?`,
        description: `Only the ${popkins(chosen.length)} you pick ${chosen.length === 1 ? 'keeps' : 'keep'} ${feature}: ${names(chosen)}. ${rest}`,
      };
    }
  }
}

/** The message that confirms a change (L2-076 AC7). */
export function modeSavedToast(feature: PopkinFeature, mode: FeatureMode): [string, string] {
  const tab = FEATURE_TAB[feature];
  switch (mode) {
    case 'Off':
      return [
        `${feature} is off`,
        `The ${tab} tab is gone from every Popkin. Nothing was deleted.`,
      ];
    case 'Everyone':
      return [
        `${feature} is on for everyone`,
        `Every live Popkin gets the ${tab} tab within a minute.`,
      ];
    default:
      return [
        `${feature} is on for chosen Popkins`,
        `Every other Popkin stops seeing the ${tab} tab within a minute. Nothing was deleted.`,
      ];
  }
}

/** The add dialog's sentence (L2-076 AC6). */
export function addPopkinText(feature: PopkinFeature): string {
  return `Only live Popkins can be added. It gets the ${FEATURE_TAB[feature]} tab within a minute.`;
}

/** What the add dialog says under its search: who already has it, or that nothing matched. */
export function addPopkinNotes(
  feature: PopkinFeature,
  text: string,
  matches: readonly { name: string; alreadyOn: boolean }[],
): string[] {
  if (!text.trim()) return [];
  if (matches.length === 0) {
    return [`No live Popkin matches “${text.trim()}”. Wrapped-up Popkins can’t be added.`];
  }
  return matches.filter((m) => m.alreadyOn).map((m) => `${m.name} already has ${feature}.`);
}

/** The failure every feature dialog shows; the reason is kept as typed (L2-087 AC5). */
export const FEATURE_SAVE_FAILED = {
  heading: 'That didn’t go through',
  text: 'Nothing has changed. Your reason is kept; try again.',
};

/** The add dialog's failure: it asks for no reason. */
export const FEATURE_ADD_FAILED = {
  heading: 'That didn’t go through',
  text: 'Nothing has changed; try again.',
};
