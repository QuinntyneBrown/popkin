import { ContactProfileView } from '../../models/contacts';
import { possessive } from './contacts-text';

/** The words of a contact's profile (docs/detailed-designs/contacts/contact-profile). */

/** "Brother · Family · Manchester": how I know them, their circle and city, the empty left out. */
export function profileSub(contact: ContactProfileView): string {
  return [contact.knownAs, contact.circle, contact.city]
    .filter((part): part is string => !!part)
    .join(' · ');
}

/**
 * While the profile loads: by name when the screen that opened it showed one, otherwise without
 * (known gap 111, ruled).
 */
export function loadingLine(first: string | null): string {
  return first ? `Loading ${possessive(first)} profile…` : 'Loading the profile…';
}

/** When the profile could not be read (L2-123 AC2, AC3). */
export function failedText(first: string | null): { heading: string; text: string } {
  return first
    ? {
        heading: `We couldn’t load ${possessive(first)} profile`,
        text: `${possessive(first)} timeline and notes are safe. Check your connection and try again.`,
      }
    : {
        heading: 'We couldn’t load this profile',
        text: 'The timeline and notes are safe. Check your connection and try again.',
      };
}

/** The menu's first item: into Closest, or out of it with where they stay (L2-131 AC1, AC4). */
export function closestItem(contact: ContactProfileView): { label: string; hint: string } {
  const first = contact.firstName;
  if (!contact.isClosest) {
    return { label: `Add ${first} to Closest`, hint: `${first} shows first in People.` };
  }
  const stays = contact.circle ? `People and ${contact.circle}` : 'People';
  return { label: `Take ${first} out of Closest`, hint: `${first} stays in ${stays}.` };
}
