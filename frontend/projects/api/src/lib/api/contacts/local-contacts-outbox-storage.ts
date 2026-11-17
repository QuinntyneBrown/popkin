import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { JsonListStorage } from '../storage/json-list-storage';
import { ContactsOutboxEntry, ContactsOutboxStorage } from './contacts-outbox';

const KEY = 'popkin.contacts-outbox';

/** The Contacts outbox in the browser's local storage: a reload keeps every waiting write. */
@Injectable()
export class LocalContactsOutboxStorage implements ContactsOutboxStorage {
  private readonly list = new JsonListStorage<ContactsOutboxEntry>(inject(DOCUMENT), KEY);

  load(): ContactsOutboxEntry[] {
    return this.list.load();
  }

  save(entries: ContactsOutboxEntry[]): void {
    this.list.save(entries);
  }
}
