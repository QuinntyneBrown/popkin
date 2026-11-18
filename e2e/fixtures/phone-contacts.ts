import type { Page } from '@playwright/test';

/**
 * The phone's own address book, as the Contact Picker API shares it (L2-179), stubbed in the
 * page: Chromium on a desktop has no `navigator.contacts`. `picked` is what the person picks in
 * the phone's chooser: one entry, or none (an empty list, as when the chooser is closed).
 */
export interface PhoneEntry {
  name: string[];
  tel: string[];
}

declare global {
  interface Window {
    pkPhoneContacts: { asked: unknown[] };
  }
}

/** Installs a Contact Picker before the app starts, answering each pick with `picked`. */
export async function aPhoneWithContacts(page: Page, picked: PhoneEntry[]): Promise<void> {
  await page.addInitScript((answer: PhoneEntry[]) => {
    window.pkPhoneContacts = { asked: [] };
    Object.defineProperty(navigator, 'contacts', {
      configurable: true,
      value: {
        select: async (properties: string[], options: unknown) => {
          window.pkPhoneContacts.asked.push({ properties, options });
          return answer;
        },
        getProperties: async () => ['name', 'tel'],
      },
    });
  }, picked);
}
