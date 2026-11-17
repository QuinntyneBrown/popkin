import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { SaveContactRequest } from '../../models/contacts';
import { NETWORK_STATUS } from '../chat/network-status';
import { toApiProblem } from '../problem';
import { OutboxQueue } from '../storage/outbox-queue';
import { Toaster } from '../toasts/toaster';
import { saveFailedHeading } from './contact-form-text';
import { CONTACTS_API } from './contacts-api';
import { ContactsFrame } from './contacts-frame';

/** A Contacts write made offline, waiting for the connection (L2-123 AC4). */
export interface ContactsOutboxEntry {
  /** The id the API keeps it once by (`IClientWrite`). */
  clientId: string;
  kind: 'add-contact';
  request: SaveContactRequest;
  state: 'Waiting' | 'Sending' | 'Failed';
}

/** Where the Contacts outbox is kept on the device, so a reload loses nothing but photos. */
export interface ContactsOutboxStorage {
  load(): ContactsOutboxEntry[];
  save(entries: ContactsOutboxEntry[]): void;
}

export const CONTACTS_OUTBOX_STORAGE = new InjectionToken<ContactsOutboxStorage>(
  'ContactsOutboxStorage',
);

/** The warning toast of a write kept offline (L2-123 AC4, contacts-toast/warning.html). */
export const OFFLINE_HEADING = 'You’re offline';
export const OFFLINE_TEXT = 'What you add is kept on this phone and saved when you’re back.';
/** The danger toast of a write the API refused once the connection returned. */
export const REFUSED_TEXT = 'Check what you typed in Add someone and try again.';

/**
 * Contacts writes made offline (docs/detailed-designs/contacts/open-contacts): kept in order, in
 * local storage, and sent one at a time when the connection returns. A photo waits with its
 * write in memory only (known gap 118). A refused write is Failed and says so in a danger toast.
 */
@Injectable({ providedIn: 'root' })
export class ContactsOutbox {
  private readonly api = inject(CONTACTS_API);
  private readonly network = inject(NETWORK_STATUS);
  private readonly storage = inject(CONTACTS_OUTBOX_STORAGE);
  private readonly toaster = inject(Toaster);
  private readonly frame = inject(ContactsFrame);

  private readonly queue = new OutboxQueue<ContactsOutboxEntry>({
    storage: this.storage,
    id: (entry) => entry.clientId,
    waiting: (entry) => ({ ...entry, state: 'Waiting' }),
  });
  private readonly sent = new Subject<void>();
  private sending = false;
  private warned = false;

  readonly entries = this.queue.entries;
  /** Each write the API has kept, so an open page reads again. */
  readonly sent$: Observable<void> = this.sent.asObservable();

  constructor() {
    this.network.backOnline$.subscribe(() => {
      this.warned = false;
      this.sendWaiting();
    });
    this.sendWaiting();
  }

  /** Whether a write now would wait: the device is offline. */
  offline(): boolean {
    return !this.network.online();
  }

  /** Keeps an Add someone made offline and says so once until the connection returns. */
  keepAdd(request: SaveContactRequest, photo: File | null): void {
    this.queue.add(
      { clientId: request.clientId, kind: 'add-contact', request, state: 'Waiting' },
      photo,
    );
    if (!this.warned) {
      this.warned = true;
      this.toaster.show('warning', OFFLINE_HEADING, OFFLINE_TEXT);
    }
  }

  /** Sends what waited, oldest first, one at a time. */
  sendWaiting(): void {
    if (this.sending || !this.network.online()) return;
    const next = this.queue.entries().find((entry) => entry.state === 'Waiting');
    if (!next) return;
    this.sending = true;
    this.queue.change(next.clientId, { state: 'Sending' });
    this.api.addContact(next.request, this.queue.file(next.clientId) ?? null).subscribe({
      next: () => {
        this.sending = false;
        this.queue.remove((entry) => entry.clientId === next.clientId);
        this.frame.refresh();
        this.sent.next();
        this.sendWaiting();
      },
      error: (error: unknown) => {
        this.sending = false;
        const status = toApiProblem(error).status;
        if (status >= 400 && status < 500) {
          this.queue.change(next.clientId, { state: 'Failed' });
          this.toaster.show('danger', saveFailedHeading(next.request.name), REFUSED_TEXT);
          this.sendWaiting();
        } else {
          this.queue.change(next.clientId, { state: 'Waiting' });
        }
      },
    });
  }
}
