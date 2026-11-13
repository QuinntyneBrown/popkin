/** The initials of a name, for the avatar when there is no photo: "Mara Okafor" is "MO". */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = (word: string) => (Array.from(word)[0] ?? '').toUpperCase();
  if (words.length === 0) return '?';
  return words.length === 1 ? first(words[0]) : first(words[0]) + first(words[words.length - 1]);
}

/**
 * What the delete-account dialog says of the active Popkins the person hosts (L2-049 AC3), or
 * null when they host none.
 */
export function hostedLine(names: string[]): { heading: string; text: string } | null {
  if (names.length === 0) return null;
  const listed =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return {
    heading: `You host ${names.length} active ${names.length === 1 ? 'Popkin' : 'Popkins'}`,
    text: `${listed} will be wrapped up when your account goes.`,
  };
}
