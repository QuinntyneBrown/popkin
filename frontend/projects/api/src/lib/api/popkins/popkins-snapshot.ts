import { DOCUMENT } from '@angular/common';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { MyPopkinsView } from '../../models/my-popkins';

/**
 * The last list of My Popkins that loaded, kept on the device so the screen has something to
 * show offline (L2-056 AC4). It is one person's: nobody else who signs in on the device reads it.
 */
export interface PopkinsSnapshot {
  read(personId: string): MyPopkinsView | null;
  write(personId: string, view: MyPopkinsView): void;
  /** Forgets the list, as signing out does (L2-054). */
  clear(): void;
}

export const POPKINS_SNAPSHOT = new InjectionToken<PopkinsSnapshot>('PopkinsSnapshot');

const KEY = 'popkin.my-popkins';

/** The snapshot in the browser's local storage. */
@Injectable()
export class LocalPopkinsSnapshot implements PopkinsSnapshot {
  private readonly document = inject(DOCUMENT);

  read(personId: string): MyPopkinsView | null {
    try {
      const saved = JSON.parse(this.storage()?.getItem(KEY) ?? 'null') as {
        personId?: unknown;
        view?: MyPopkinsView;
      } | null;
      const view = saved?.personId === personId ? saved.view : null;
      return view && Array.isArray(view.active) && Array.isArray(view.wrappedUp) ? view : null;
    } catch {
      return null;
    }
  }

  write(personId: string, view: MyPopkinsView): void {
    try {
      this.storage()?.setItem(KEY, JSON.stringify({ personId, view }));
    } catch {
      // A full or closed store means there is nothing to show offline.
    }
  }

  clear(): void {
    try {
      this.storage()?.removeItem(KEY);
    } catch {
      // Nothing was kept.
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
