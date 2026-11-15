import { AuditEntry } from '../../../models/admin';

/** The entries of one day, under "Today", "Yesterday" or "Sun 13 Jul". */
export interface AuditDay {
  label: string;
  entries: AuditEntry[];
}

function dayKey(at: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

function dayLabel(at: Date, now: Date, timeZone: string): string {
  const key = dayKey(at, timeZone);
  if (key === dayKey(now, timeZone)) return 'Today';
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timeZone)) return 'Yesterday';
  // "Sun 13 Jul": en-GB writes "Sun 13 Jul" with no comma.
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(at)
    .replace(',', '');
}

/** Groups entries, newest first as the API gives them, by their day in `timeZone`. */
export function groupByDay(entries: AuditEntry[], now: Date, timeZone: string): AuditDay[] {
  const days: AuditDay[] = [];
  for (const entry of entries) {
    const label = dayLabel(new Date(entry.at), now, timeZone);
    const last = days.at(-1);
    if (last?.label === label) last.entries.push(entry);
    else days.push({ label, entries: [entry] });
  }
  return days;
}

/** "10:39": the time of an entry on the 24-hour clock. */
export function timeText(at: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(at));
}

/** "Showing 10 of 1,284 actions", or "… actions by Aiko Tanaka" while one admin is chosen. */
export function showingText(shown: number, total: number, adminName?: string): string {
  const count = new Intl.NumberFormat('en-GB').format(total);
  const actions = total === 1 ? 'action' : 'actions';
  return `Showing ${shown} of ${count} ${actions}${adminName ? ` by ${adminName}` : ''}`;
}
