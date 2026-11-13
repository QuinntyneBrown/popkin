import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { OutboxEntry, OutboxStorage } from './message-outbox';

const KEY = 'popkin.outbox';

/** The outbox in the browser's local storage: text messages survive a reload (L2-028 AC2). */
@Injectable()
export class LocalOutboxStorage implements OutboxStorage {
  private readonly document = inject(DOCUMENT);

  load(): OutboxEntry[] {
    try {
      const entries: unknown = JSON.parse(this.storage()?.getItem(KEY) ?? '[]');
      return Array.isArray(entries) ? (entries as OutboxEntry[]) : [];
    } catch {
      return [];
    }
  }

  save(entries: OutboxEntry[]): void {
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
