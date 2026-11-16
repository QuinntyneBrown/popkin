/** The words of the contact form (docs/detailed-designs/contacts/add-contact). */

/** The start of the failed-save banner, by the first word of the name typed (L2-129 AC6). */
export function saveFailedHeading(name: string): string {
  return `We couldn’t save ${name.trim().split(/\s+/)[0]}.`;
}

/** The rest of the failed-save banner (L2-129 AC6). */
export const SAVE_FAILED_TEXT =
  'Everything you typed is still here. Check your connection and try Save again.';

/** The heading of Edit: "Edit Chidi" (L2-130 AC1). */
export function editHeading(firstName: string): string {
  return `Edit ${firstName}`;
}
