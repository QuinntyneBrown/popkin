import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const KEY = 'popkin.drafts';

/**
 * Text typed in a thread and not sent, kept for the browser tab's session: leaving the thread
 * and coming back finds it in the message field (L2-028 AC4).
 */
@Injectable({ providedIn: 'root' })
export class DraftStore {
  private readonly storage = sessionStorageOf(inject(DOCUMENT));

  get(threadId: string): string {
    return this.read()[threadId] ?? '';
  }

  set(threadId: string, text: string): void {
    const drafts = this.read();
    if (text) drafts[threadId] = text;
    else delete drafts[threadId];
    try {
      this.storage?.setItem(KEY, JSON.stringify(drafts));
    } catch {
      // A full or closed store loses the draft, never the page.
    }
  }

  private read(): Record<string, string> {
    try {
      const drafts: unknown = JSON.parse(this.storage?.getItem(KEY) ?? '{}');
      return drafts && typeof drafts === 'object' ? (drafts as Record<string, string>) : {};
    } catch {
      return {};
    }
  }
}

function sessionStorageOf(document: Document): Storage | null {
  try {
    return document.defaultView?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
