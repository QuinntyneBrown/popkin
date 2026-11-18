import { Injectable, signal } from '@angular/core';
import { ContactProfileView } from '../../models/contacts';

/**
 * The people added since Quick Add opened (L2-181 AC2), for the web app's lifetime: Quick Add
 * says when it opens and each save it makes. "Add another" carries the count on; any other way
 * into Quick Add starts again at none. A reload starts again too.
 */
@Injectable({ providedIn: 'root' })
export class QuickAddSession {
  private readonly counted = signal(0);
  private readonly kept = signal<ContactProfileView | null>(null);
  private continuing = false;

  /** How many were added since Quick Add opened. */
  readonly count = this.counted.asReadonly();
  /** The last one added, which Added shows with no request. */
  readonly last = this.kept.asReadonly();

  /** Quick Add opened: a new session, unless "Add another" opened it. */
  opened(): void {
    if (!this.continuing) this.counted.set(0);
    this.continuing = false;
  }

  /** Quick Add kept someone. */
  added(contact: ContactProfileView): void {
    this.counted.update((n) => n + 1);
    this.kept.set(contact);
  }

  /** "Add another": the next Quick Add carries the count on (L2-181 AC1). */
  addAnother(): void {
    this.continuing = true;
  }

  /** The last one added when it is the contact asked for; otherwise Added reads them. */
  contact(contactId: string): ContactProfileView | null {
    const last = this.kept();
    return last?.id === contactId ? last : null;
  }
}
