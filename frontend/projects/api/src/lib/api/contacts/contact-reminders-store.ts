import { DOCUMENT, Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ContactReminderView } from '../../models/reminders';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';

/** "Open Grace’s profile". */
export function reminderAction(firstName: string | null): string {
  return firstName ? `Open ${firstName}’s profile` : 'Open their profile';
}

/**
 * The owner's reminders (docs/detailed-designs/contacts/reminders): read when a Contacts page
 * opens and when the window regains focus in Contacts, each shown once as an info toast that
 * stays until dismissed (L2-140 AC1). Dismissing one is saved, and a failed save puts it back.
 * The device's zone is saved when the app starts (AppTimeZone).
 */
@Injectable({ providedIn: 'root' })
export class ContactRemindersStore {
  private readonly api = inject(CONTACTS_API);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);
  private readonly window = inject(DOCUMENT).defaultView;
  private readonly shown = new Set<string>();
  private started = false;

  open(): void {
    if (!this.started) {
      this.started = true;
      this.window?.addEventListener('focus', () => {
        if (this.router.url.startsWith('/contacts')) this.read();
      });
    }
    this.read();
  }

  private read(): void {
    this.api.reminders().subscribe({
      next: (reminders) =>
        reminders.filter((reminder) => !this.shown.has(reminder.id)).forEach((r) => this.show(r)),
      error: () => undefined,
    });
  }

  private show(reminder: ContactReminderView): void {
    this.shown.add(reminder.id);
    const contactId = reminder.contactId;
    this.toaster.show(
      'info',
      reminder.words,
      undefined,
      contactId
        ? {
            label: reminderAction(reminder.firstName),
            run: () => void this.router.navigateByUrl(`/contacts/people/${contactId}`),
          }
        : undefined,
      { lasting: true, dismissed: () => this.dismiss(reminder) },
    );
  }

  private dismiss(reminder: ContactReminderView): void {
    this.api.dismissReminder(reminder.id).subscribe({ error: () => this.show(reminder) });
  }
}
