import { Injectable, inject, signal } from '@angular/core';
import {
  ContactCircle,
  ContactProfileView,
  KeyDateDraft,
  ReminderLead,
  SaveContactRequest,
} from '../../models/contacts';
import { ConnectionKindName } from '../../models/connections';
import { GroupView } from '../../models/groups';
import { toApiProblem } from '../problem';
import { CONTACTS_API } from './contacts-api';
import { ContactsOutbox } from './contacts-outbox';
import { isContactId } from './contacts-text';

/** What the contact form holds as typed: "Things they love" is one field (known gap 102). */
/** A connection in "How they connect": kept (`id`), or chosen in Connect and not saved yet. */
export interface FormConnection {
  id: string | null;
  otherContactId: string;
  name: string;
  initials: string;
  accent: string;
  photoUrl: string | null;
  kind: ConnectionKindName;
  words: string | null;
  promised: boolean;
}

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
  /** "Dates to remember": the kept dates, then those added, until "Save" (L2-129 AC2). */
  readonly dates = signal<KeyDateDraft[]>([]);
  /** "How they connect": the kept connections, then those added, until "Save" (L2-150 AC9). */
  readonly connections = signal<FormConnection[]>([]);
  private disconnected: string[] = [];
  /** "Groups": the person's groups, left out with none, and those the contact is in (L2-147 AC6). */
  readonly groups = signal<GroupView[]>([]);
  readonly groupIds = signal<readonly string[]>([]);

  /** Reads the person's groups for the "Groups" toggles; without them the part is left out. */
  loadGroups(): void {
    this.api.groups().subscribe({
      next: (groups) => this.groups.set(groups),
      error: () => this.groups.set([]),
    });
  }

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
      next: (contact) => {
        this.dates.set(
          (contact.keyDates ?? []).map((d) => ({
            id: d.id,
            kind: d.kind,
            title: d.title,
            month: d.month,
            day: d.day,
            year: d.year,
            everyYear: d.everyYear,
            reminder: d.reminder,
          })),
        );
        this.connections.set(
          (contact.around ?? []).map((a) => ({
            id: a.id,
            otherContactId: a.contactId,
            name: a.name,
            initials: a.initials,
            accent: a.accent.toLowerCase(),
            photoUrl: a.photoUrl,
            kind: a.kind,
            words: a.words,
            promised: a.promised,
          })),
        );
        this.disconnected = [];
        this.groupIds.set((contact.groups ?? []).map((g) => g.id));
        this.editing.set(contact);
      },
      error: (error: unknown) =>
        this.reading.set(toApiProblem(error).code === 'contact_not_found' ? 'notFound' : 'failed'),
    });
  }

  /** "Try again" after the contact could not be read. */
  retry(): void {
    this.edit(this.editingId);
  }

  /** "Another date": a date chosen in Add a date, saved with the contact. */
  addDate(draft: KeyDateDraft): void {
    this.dates.update((dates) => [...dates, draft]);
  }

  /** "Remove the {kind}". */
  removeDate(index: number): void {
    this.dates.update((dates) => dates.filter((_, i) => i !== index));
  }

  /** "Remind me about the {kind}". */
  changeReminder(index: number, reminder: ReminderLead): void {
    this.dates.update((dates) => dates.map((d, i) => (i === index ? { ...d, reminder } : d)));
  }

  /** "Connect to someone": a connection chosen in Connect, saved with the contact. */
  addConnection(connection: FormConnection): void {
    this.connections.update((connections) => [...connections, connection]);
  }

  /** "Remove the connection to {first name}": a kept one is removed on "Save". */
  removeConnection(index: number): void {
    const removed = this.connections()[index];
    if (removed?.id) this.disconnected = [...this.disconnected, removed.id];
    this.connections.update((connections) => connections.filter((_, i) => i !== index));
  }

  /** With no name, nothing is sent and the form is invalid (L2-129 AC4). */
  save(values: ContactFormValues, photo: File | null): void {
    if (this.state() === 'saving') return;
    const request = {
      ...contactRequestOf(values, this.clientId),
      keyDates: this.dates(),
      connect: this.connections()
        .filter((c) => c.id === null)
        .map((c) => ({
          otherContactId: c.otherContactId,
          kind: c.kind,
          words: c.words,
          promised: c.promised,
        })),
      disconnect: this.disconnected,
      groupIds: [...this.groupIds()],
    };
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
