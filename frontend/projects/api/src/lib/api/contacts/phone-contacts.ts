import { Injectable, InjectionToken } from '@angular/core';

/** One entry of the phone's own address book, as Quick Add takes it (L2-179 AC2). */
export interface PhoneContact {
  name: string;
  /** The entry's first number, or null when it has none. */
  phone: string | null;
}

/** The phone's own contacts, where the browser can share them (the Contact Picker API). */
export interface PhoneContacts {
  /** Whether the browser can share them; "Pick from my phone's contacts" shows only then. */
  readonly available: boolean;
  /** One entry picked by the person, or null when none is picked or the browser refuses. */
  pickOne(): Promise<PhoneContact | null>;
}

export const PHONE_CONTACTS = new InjectionToken<PhoneContacts>('PHONE_CONTACTS');

interface ContactsManager {
  select(
    properties: string[],
    options: { multiple: boolean },
  ): Promise<{ name?: string[]; tel?: string[] }[]>;
}

/** The first name of an entry, and its first number, or null for an entry with no name. */
export function phoneContactOf(
  entry: { name?: string[]; tel?: string[] } | undefined,
): PhoneContact | null {
  const name = entry?.name?.map((n) => n.trim()).find((n) => n.length > 0);
  if (!name) return null;
  const phone = entry?.tel?.map((t) => t.trim()).find((t) => t.length > 0) ?? null;
  return { name, phone };
}

/** The browser's Contact Picker, `navigator.contacts.select`, for one entry's name and numbers. */
@Injectable()
export class BrowserPhoneContacts implements PhoneContacts {
  private readonly manager = (globalThis.navigator as { contacts?: Partial<ContactsManager> })
    ?.contacts;

  readonly available = typeof this.manager?.select === 'function';

  async pickOne(): Promise<PhoneContact | null> {
    if (!this.available) return null;
    try {
      const picked = await (this.manager as ContactsManager).select(['name', 'tel'], {
        multiple: false,
      });
      return phoneContactOf(picked[0]);
    } catch {
      return null;
    }
  }
}
