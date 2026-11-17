/** "today", "tomorrow" or "in {n} days", for a day `days` ahead. */
export function daysAway(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** The text with its first letter a capital, to start a line: "Tomorrow". */
export function capitalised(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
