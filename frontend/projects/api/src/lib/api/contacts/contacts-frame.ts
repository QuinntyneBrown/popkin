import { Injectable, computed, inject, signal } from '@angular/core';
import { CONTACTS_API } from './contacts-api';
import { countLine } from './contacts-text';

/**
 * What every Contacts page shows around its own content: the count line of the navigation
 * (L2-121 AC3). Kept for the whole app, read again by each page as it opens; a failed read
 * keeps the last answer, and a page stays usable without one.
 */
@Injectable({ providedIn: 'root' })
export class ContactsFrame {
  private readonly api = inject(CONTACTS_API);

  /** How many contacts I keep; null until the summary has been read. */
  readonly people = signal<number | null>(null);
  readonly countLine = computed(() => {
    const people = this.people();
    return people === null ? '' : countLine(people);
  });

  refresh(): void {
    this.api.summary().subscribe({
      next: (summary) => this.people.set(summary.people),
      error: () => undefined,
    });
  }
}
