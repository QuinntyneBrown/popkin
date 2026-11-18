import { Injectable, computed, inject, signal } from '@angular/core';
import { ContactProfileView } from '../../models/contacts';
import { toApiProblem } from '../problem';
import { addedCount } from './contact-added-text';
import { CONTACTS_API } from './contacts-api';
import { isContactId } from './contacts-text';
import { QuickAddSession } from './quick-add-session';

/**
 * Added (docs/detailed-designs/contacts/contact-added): the contact Quick Add just kept, from the
 * session with no request, or read on a reload or a direct visit. One per screen; the page
 * provides it.
 */
@Injectable()
export class ContactAddedStore {
  private readonly api = inject(CONTACTS_API);
  private readonly session = inject(QuickAddSession);
  private contactId = '';
  private readonly fromSession = signal(false);

  readonly state = signal<'reading' | 'ready' | 'notFound' | 'failed'>('reading');
  readonly contact = signal<ContactProfileView | null>(null);
  /** The count, only for a contact this session added (L2-181 AC2). */
  readonly count = computed(() =>
    this.state() === 'ready' && this.fromSession() ? addedCount(this.session.count()) : null,
  );

  open(contactId: string): void {
    this.contactId = contactId;
    const added = this.session.contact(contactId);
    this.fromSession.set(added !== null);
    if (added) {
      this.contact.set(added);
      this.state.set('ready');
      return;
    }
    if (!isContactId(contactId)) {
      this.state.set('notFound');
      return;
    }
    this.state.set('reading');
    this.api.contact(contactId).subscribe({
      next: (contact) => {
        this.contact.set(contact);
        this.state.set('ready');
      },
      error: (error: unknown) =>
        this.state.set(toApiProblem(error).code === 'contact_not_found' ? 'notFound' : 'failed'),
    });
  }

  /** "Try again" after the contact could not be read. */
  retry(): void {
    this.open(this.contactId);
  }

  /** "Add another": the next Quick Add counts on (L2-181 AC1). */
  addAnother(): void {
    this.session.addAnother();
  }
}
