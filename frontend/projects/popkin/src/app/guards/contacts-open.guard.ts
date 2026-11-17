import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContactRemindersStore, ContactsFrame } from 'api';
import { map } from 'rxjs';

/**
 * Contacts opens only while the API says it is switched on (ADR 0023); otherwise, or when the
 * API cannot say, My Popkins opens instead. Runs after the signed-in guard. Each Contacts page
 * that opens reads the reminders (L2-140 AC1).
 */
export const contactsOpenGuard: CanActivateFn = () => {
  const router = inject(Router);
  const reminders = inject(ContactRemindersStore);
  return inject(ContactsFrame)
    .open()
    .pipe(
      map((open) => {
        if (!open) return router.createUrlTree(['/popkins']);
        reminders.open();
        return true;
      }),
    );
};
