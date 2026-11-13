/**
 * The time a Popkin has left, in its largest two units: "1 day 6 hrs left", "42 min left".
 * Null once the end has passed.
 */
export function timeLeft(endsAt: Date, now: Date): string | null {
  const ms = endsAt.getTime() - now.getTime();
  if (ms <= 0) return null;
  const totalMinutes = Math.max(1, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days ? `${days} ${days === 1 ? 'day' : 'days'}` : '',
    hours ? `${hours} ${hours === 1 ? 'hr' : 'hrs'}` : '',
    minutes ? `${minutes} min` : '',
  ];
  const first = parts.findIndex(Boolean);
  return `${parts
    .slice(first, first + 2)
    .filter(Boolean)
    .join(' ')} left`;
}
