/** How many show under a Popkin before "Show {n} more" (L2-151 AC6). */
export const IMPORT_SHOWN = 4;

/** "Import 23 people", "Import 1 person", "Import nobody" (L2-151 AC1, AC3). */
export function importLabel(count: number): string {
  if (count === 0) return 'Import nobody';
  return count === 1 ? 'Import 1 person' : `Import ${count} people`;
}

/** "Importing 23 people…" while it is sent. */
export function importingLabel(count: number): string {
  return count === 1 ? 'Importing 1 person…' : `Importing ${count} people…`;
}

/** A Popkin's number of people: "13 people". */
export function importPeople(count: number): string {
  return count === 1 ? '1 person' : `${count} people`;
}

/** "Show 9 more". */
export function showMore(count: number): string {
  return `Show ${count} more`;
}

/** Today's line when there are people to import (L2-125 AC8). */
export function readyToImport(count: number): string {
  return count === 1
    ? '1 person from your Popkins is ready to import. Only you can see your contacts.'
    : `${count} people from your Popkins are ready to import. Only you can see your contacts.`;
}
