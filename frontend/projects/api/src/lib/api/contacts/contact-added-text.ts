/** "Femi’s in your contacts" (L2-180 AC1). */
export function addedHeading(firstName: string): string {
  return `${firstName}’s in your contacts`;
}

/** Their circle and who they are, "Friends · Grace’s fiancé", or the circle alone (L2-180 AC1). */
export function addedLine(circle: string | null, knownAs: string | null): string {
  return [circle, knownAs?.trim()].filter((part) => !!part).join(' · ');
}

/** "3 people added today", from the second person on; null for the first (L2-181 AC2). */
export function addedCount(count: number): string | null {
  return count >= 2 ? `${count} people added today` : null;
}
