import { Injectable, inject, signal } from '@angular/core';
import { ContactCircle, ContactProfileView, SaveContactRequest } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';

/** What the contact form holds as typed: "Things they love" is one field (known gap 102). */
export interface ContactFormValues {
  name: string;
  knownAs: string;
  circle: ContactCircle | null;
  phone: string;
  email: string;
  city: string;
  loves: string;
}

/** The request a save sends: the name trimmed, and the things they love split at commas. */
export function contactRequestOf(values: ContactFormValues, clientId: string): SaveContactRequest {
  return {
    clientId,
    name: values.name.trim(),
    knownAs: values.knownAs,
    circle: values.circle,
    phone: values.phone,
    email: values.email,
    city: values.city,
    loves: values.loves
      .split(',')
      .map((love) => love.trim())
      .filter((love) => love.length > 0),
  };
}

/**
 * Add someone (docs/detailed-designs/contacts/add-contact): saving the form. One per screen; the
 * page provides it. A save the API has not confirmed is sent again under the same client id, so
 * it is kept once (L2-123 AC4).
 */
@Injectable()
export class ContactFormStore {
  private readonly api = inject(CONTACTS_API);
  private clientId = crypto.randomUUID();

  readonly state = signal<'idle' | 'invalid' | 'saving' | 'failed'>('idle');
  /** The contact once the API has kept them; the page then opens their profile (L2-129 AC5). */
  readonly saved = signal<ContactProfileView | null>(null);

  /** With no name, nothing is sent and the form is invalid (L2-129 AC4). */
  save(values: ContactFormValues, photo: File | null): void {
    if (this.state() === 'saving') return;
    const request = contactRequestOf(values, this.clientId);
    if (request.name.length === 0) {
      this.state.set('invalid');
      return;
    }
    this.state.set('saving');
    this.api.addContact(request, photo).subscribe({
      next: (contact) => {
        this.clientId = crypto.randomUUID();
        this.saved.set(contact);
        this.state.set('idle');
      },
      error: () => this.state.set('failed'),
    });
  }
}
