import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { CONTACTS_API } from './contacts-api';
import { countLine } from './contacts-text';
import { FollowUpsStore } from './follow-ups-store';
import { followUpsDueLabel } from './follow-ups-text';

/**
 * What every Contacts page shows around its own content: the count line of the navigation
 * (L2-121 AC3). Kept for the whole app, read again by each page as it opens; a failed read
 * keeps the last answer, and a page stays usable without one.
 */
@Injectable({ providedIn: 'root' })
export class ContactsFrame {
  private readonly api = inject(CONTACTS_API);
  private readonly followUps = inject(FollowUpsStore);

  /** How many contacts I keep; null until the summary has been read. */
  readonly people = signal<number | null>(null);
  readonly countLine = computed(() => {
    const people = this.people();
    return people === null ? '' : countLine(people);
  });

  /** Follow-ups late or due today, the badge of the Follow-ups tab (L2-121 AC5). */
  readonly due = computed(() => this.followUps.due());
  readonly dueLabel = computed(() => followUpsDueLabel(this.due()));

  /**
   * Whether Contacts is open, read before a Contacts page opens (ADR 0023): true once the
   * summary answers, which it also keeps; false when switched off or when the API cannot say.
   */
  open(): Observable<boolean> {
    return this.api.summary().pipe(
      map((summary) => {
        this.people.set(summary.people);
        this.followUps.refresh();
        return true;
      }),
      catchError(() => of(false)),
    );
  }

  refresh(): void {
    this.api.summary().subscribe({
      next: (summary) => this.people.set(summary.people),
      error: () => undefined,
    });
  }
}
