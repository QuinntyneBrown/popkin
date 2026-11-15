import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContactsFrame } from 'api';
import { map } from 'rxjs';

/**
 * Contacts opens only while the API says it is switched on (ADR 0023); otherwise, or when the
 * API cannot say, My Popkins opens instead. Runs after the signed-in guard.
 */
export const contactsOpenGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(ContactsFrame)
    .open()
    .pipe(map((open) => (open ? true : router.createUrlTree(['/popkins']))));
};
