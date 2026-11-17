import type { EventView } from '../../models/schedule';
import { dateOf, isWithinAYear } from './schedule-weeks';
import { SHORT_MONTHS as months } from '../text/calendar';

/** The longest label an event may have (L2-085 AC2). */
export const EVENT_LABEL_MAX = 40;

/** "Sep 25 – 27", "Feb 27 – Mar 2", "Dec 30 2026 – Jan 2 2027", or "Sep 25" for one day. */
export function eventDays(firstDay: string, lastDay: string): string {
  const first = dateOf(firstDay);
  const last = dateOf(lastDay);
  const day = (date: Date) => `${months[date.getMonth()]} ${date.getDate()}`;
  if (firstDay === lastDay) return day(first);
  if (first.getFullYear() !== last.getFullYear())
    return `${day(first)} ${first.getFullYear()} – ${day(last)} ${last.getFullYear()}`;
  if (first.getMonth() !== last.getMonth()) return `${day(first)} – ${day(last)}`;
  return `${day(first)} – ${last.getDate()}`;
}

/** The hint of "Set the event" in Popkin settings (L2-085 AC1). */
export function eventHint(event: EventView | null): string {
  return event ? `${event.label} · ${eventDays(event.firstDay, event.lastDay)}` : 'Not set';
}

export type EventField = 'label' | 'firstDay' | 'lastDay';

export interface EventError {
  readonly field: EventField;
  readonly message: string;
}

/** The first rule an event as typed breaks (L2-085 AC2), checked as the API checks it, or null. */
export function eventError(event: EventView, today: string): EventError | null {
  if (!event.label.trim()) return { field: 'label', message: 'Give the event a label.' };
  if (!event.firstDay) return { field: 'firstDay', message: 'Pick the first day.' };
  if (!event.lastDay) return { field: 'lastDay', message: 'Pick the last day.' };
  if (event.lastDay < event.firstDay)
    return { field: 'lastDay', message: 'The last day is before the first day.' };
  if (!isWithinAYear(event.firstDay, today))
    return { field: 'firstDay', message: 'The event can be set up to a year ahead.' };
  return null;
}
