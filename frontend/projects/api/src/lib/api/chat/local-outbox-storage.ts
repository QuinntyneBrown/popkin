import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { JsonListStorage } from '../storage/json-list-storage';
import { OutboxEntry, OutboxStorage } from './message-outbox';

const KEY = 'popkin.outbox';

/** The outbox in the browser's local storage: text messages survive a reload (L2-028 AC2). */
@Injectable()
export class LocalOutboxStorage implements OutboxStorage {
  private readonly list = new JsonListStorage<OutboxEntry>(inject(DOCUMENT), KEY);

  load(): OutboxEntry[] {
    return this.list.load();
  }

  save(entries: OutboxEntry[]): void {
    this.list.save(entries);
  }
}
