import { ReminderLead } from '../../models/contacts';
import { BirthdayReminderView } from '../../models/notifications';
import { REMINDER_LEADS } from '../contacts/contact-dates-text';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** How many birthdays the People view shows before "Show all" (L2-159 AC2). */
export const BIRTHDAYS_SHOWN = 5;

/**
 * The line under a birthday's name (L2-159 AC1): "Sat 19 Sep · turns 33 · in 7 days", without
 * "turns" when the year is unknown, and "today" or "tomorrow" when that near.
 */
export function birthdayLine(
  birthday: Pick<BirthdayReminderView, 'occursOn' | 'turns' | 'inDays'>,
): string {
  const [year, month, day] = birthday.occursOn.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(year, month - 1, day).getDay()];
  const on = `${weekday} ${day} ${MONTHS[month - 1]}`;
  const when =
    birthday.inDays === 0
      ? 'today'
      : birthday.inDays === 1
        ? 'tomorrow'
        : `in ${birthday.inDays} days`;
  return [on, birthday.turns ? `turns ${birthday.turns}` : null, when].filter(Boolean).join(' · ');
}

/**
 * The lead times a birthday's select offers: the five of L2-159 AC1, and "1 month before" only
 * for a birthday that already has it, so the select never shows a value it cannot hold.
 */
export function birthdayLeads(
  lead: ReminderLead,
): readonly { value: ReminderLead; label: string }[] {
  return REMINDER_LEADS.filter(
    (option) => option.value !== 'OneMonthBefore' || lead === 'OneMonthBefore',
  );
}
