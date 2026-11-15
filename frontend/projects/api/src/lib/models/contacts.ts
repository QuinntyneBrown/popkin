/** How many contacts I keep: the count line of every Contacts screen (L2-121, L2-126 AC1). */
export interface ContactsSummaryView {
  people: number;
}

/** The kind of tie I have with a contact (L2-129 AC1). */
export type ContactCircle = 'Family' | 'Friends' | 'Work' | 'Neighbours' | 'Clubs';

/** The circles in the order Add someone offers them. */
export const CONTACT_CIRCLES: readonly ContactCircle[] = [
  'Family',
  'Friends',
  'Work',
  'Neighbours',
  'Clubs',
];

/** What Add someone and Edit send as the part `contact` (L2-129, L2-130). */
export interface SaveContactRequest {
  /** Given by the web app to each save, so a resend saves once (L2-123 AC4). */
  clientId: string;
  name: string;
  knownAs: string;
  circle: ContactCircle | null;
  phone: string;
  email: string;
  city: string;
  loves: string[];
}

/**
 * A contact as their profile and the edit form show them (L2-128, L2-130). Their dates, habit,
 * connections, groups and counts join as their designs are built.
 */
export interface ContactProfileView {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  knownAs: string | null;
  circle: ContactCircle | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  loves: string[];
  isClosest: boolean;
}
