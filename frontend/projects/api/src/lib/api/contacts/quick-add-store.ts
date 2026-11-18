import { Injectable, inject, signal } from '@angular/core';
import { ContactCircle, ContactProfileView, SaveContactRequest } from '../../models/contacts';
import { contactRequestOf } from './contact-form-store';
import { CONTACTS_API } from './contacts-api';
import { ContactsOutbox } from './contacts-outbox';

/** What Quick Add asks for (L2-178 AC1): a name, and the rest optional. */
export interface QuickAddValues {
  name: string;
  phone: string;
  /** "Who are they?", kept as how the person knows them. */
  knownAs: string;
  circle: ContactCircle;
}

/** The circle Quick Add starts with (L2-178 AC1, L2-181 AC1). */
export const QUICK_ADD_CIRCLE: ContactCircle = 'Friends';

/** "Save" is on once the name, trimmed, is not empty (L2-178 AC2). */
export function canQuickAdd(name: string): boolean {
  return name.trim().length > 0;
}

/** Add someone's request with Quick Add's fields only, the others empty. */
export function quickAddRequestOf(values: QuickAddValues, clientId: string): SaveContactRequest {
  return contactRequestOf({ ...values, email: '', city: '', howWeMet: '', loves: '' }, clientId);
}

/**
 * Quick Add (docs/detailed-designs/contacts/quick-add): saving the form. One per screen; the page
 * provides it. A save is sent at once, not through the outbox, so Added has the saved contact;
 * a save "Save" sends again after a failure carries the same client id, so it is kept once.
 * Offline, the add waits in the outbox and the form starts again (known gap 157).
 */
@Injectable()
export class QuickAddStore {
  private readonly api = inject(CONTACTS_API);
  private readonly outbox = inject(ContactsOutbox);
  private clientId = crypto.randomUUID();

  readonly state = signal<'idle' | 'saving' | 'failed'>('idle');
  /** The contact once the API has kept them; the page then opens Added (L2-178 AC4). */
  readonly saved = signal<ContactProfileView | null>(null);
  /** How many adds were kept on the device while offline; each empties the form. */
  readonly kept = signal(0);

  save(values: QuickAddValues, photo: File | null): void {
    if (this.state() === 'saving' || !canQuickAdd(values.name)) return;
    const request = quickAddRequestOf(values, this.clientId);
    if (this.outbox.offline()) {
      this.outbox.keepAdd(request, photo);
      this.clientId = crypto.randomUUID();
      this.kept.update((n) => n + 1);
      return;
    }
    this.state.set('saving');
    this.api.addContact(request, photo).subscribe({
      next: (contact) => {
        this.clientId = crypto.randomUUID();
        this.state.set('idle');
        this.saved.set(contact);
      },
      error: () => this.state.set('failed'),
    });
  }
}
