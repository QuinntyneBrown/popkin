import { Injectable, inject, signal } from '@angular/core';
import { ContactCircle, ContactProfileView, SaveContactRequest } from '../../models/contacts';
import { toApiProblem } from '../problem';
import { CONTACTS_API } from './contacts-api';
import { ContactsOutbox } from './contacts-outbox';
import { isContactId } from './contacts-text';

/** What the contact form holds as typed: "Things they love" is one field (known gap 102). */
export interface ContactFormValues {
  name: string;
  knownAs: string;
  circle: ContactCircle | null;
  phone: string;
  email: string;
  city: string;
  howWeMet: string;
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
    howWeMet: values.howWeMet,
    loves: values.loves
      .split(',')
      .map((love) => love.trim())
      .filter((love) => love.length > 0),
  };
}

/** The form filled from a kept contact, the things they love as one field (L2-130 AC1). */
export function contactValuesOf(contact: ContactProfileView): ContactFormValues {
  return {
    name: contact.name,
    knownAs: contact.knownAs ?? '',
    circle: contact.circle,
    phone: contact.phone ?? '',
    email: contact.email ?? '',
    city: contact.city ?? '',
    howWeMet: contact.howWeMet ?? '',
    loves: contact.loves.join(', '),
  };
}

/**
 * Add someone and Edit (docs/detailed-designs/contacts/add-contact): saving the form. One per screen; the
 * page provides it. A save the API has not confirmed is sent again under the same client id, so
 * it is kept once (L2-123 AC4).
 */
@Injectable()
export class ContactFormStore {
  private readonly api = inject(CONTACTS_API);
  private readonly outbox = inject(ContactsOutbox);
  private clientId = crypto.randomUUID();

  readonly state = signal<'idle' | 'invalid' | 'saving' | 'failed'>('idle');
  /** The contact once the API has kept them; the page then opens their profile (L2-129 AC5). */
  readonly saved = signal<ContactProfileView | null>(null);
  /** An add kept on the device while offline, to be sent when the connection returns (L2-123 AC4). */
  readonly kept = signal(false);
  /** The contact being edited, once read; null while adding someone (L2-130). */
  readonly editing = signal<ContactProfileView | null>(null);

  /**
   * Reading the contact to edit: `notFound` for one that is not mine, or an address that cannot
   * name one (L2-122 AC2), `failed` when it could not be read.
   */
  readonly reading = signal<'idle' | 'notFound' | 'failed'>('idle');
  private editingId = '';

  /** Edit: read the contact, so the form shows every value (L2-130 AC1). */
  edit(contactId: string): void {
    this.editingId = contactId;
    if (!isContactId(contactId)) {
      this.reading.set('notFound');
      return;
    }
    this.reading.set('idle');
    this.api.contact(contactId).subscribe({
      next: (contact) => this.editing.set(contact),
      error: (error: unknown) =>
        this.reading.set(toApiProblem(error).code === 'contact_not_found' ? 'notFound' : 'failed'),
    });
  }

  /** "Try again" after the contact could not be read. */
  retry(): void {
    this.edit(this.editingId);
  }

  /** With no name, nothing is sent and the form is invalid (L2-129 AC4). */
  save(values: ContactFormValues, photo: File | null): void {
    if (this.state() === 'saving') return;
    const request = contactRequestOf(values, this.clientId);
    if (request.name.length === 0) {
      this.state.set('invalid');
      return;
    }
    const editing = this.editing();
    if (!editing && this.outbox.offline()) {
      this.outbox.keepAdd(request, photo);
      this.clientId = crypto.randomUUID();
      this.kept.set(true);
      return;
    }
    this.state.set('saving');
    const sent = editing
      ? this.api.editContact(editing.id, request, photo)
      : this.api.addContact(request, photo);
    sent.subscribe({
      next: (contact) => {
        this.clientId = crypto.randomUUID();
        this.saved.set(contact);
        this.state.set('idle');
      },
      error: () => this.state.set('failed'),
    });
  }
}
