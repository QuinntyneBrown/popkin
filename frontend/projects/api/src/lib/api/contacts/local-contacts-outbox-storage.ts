import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { ContactsOutboxEntry, ContactsOutboxStorage } from './contacts-outbox';

const KEY = 'popkin.contacts-outbox';

/** The Contacts outbox in the browser's local storage: a reload keeps every waiting write. */
@Injectable()
export class LocalContactsOutboxStorage implements ContactsOutboxStorage {
  private readonly document = inject(DOCUMENT);

  load(): ContactsOutboxEntry[] {
    try {
      const entries: unknown = JSON.parse(this.storage()?.getItem(KEY) ?? '[]');
      return Array.isArray(entries) ? (entries as ContactsOutboxEntry[]) : [];
    } catch {
      return [];
    }
  }

  save(entries: ContactsOutboxEntry[]): void {
    try {
      if (entries.length === 0) this.storage()?.removeItem(KEY);
      else this.storage()?.setItem(KEY, JSON.stringify(entries));
    } catch {
      // A full or closed store keeps the outbox in memory only.
    }
  }

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
