import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SaveContactRequest } from '../../models/contacts';
import { NETWORK_STATUS } from '../chat/network-status';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { ContactsFrame } from './contacts-frame';
import {
  CONTACTS_OUTBOX_STORAGE,
  ContactsOutbox,
  ContactsOutboxEntry,
  OFFLINE_HEADING,
  OFFLINE_TEXT,
  REFUSED_TEXT,
} from './contacts-outbox';

const request = (name: string): SaveContactRequest =>
  ({ clientId: `id-${name}`, name, loves: [] }) as unknown as SaveContactRequest;

describe('ContactsOutbox', () => {
  let online: ReturnType<typeof vi.fn>;
  let back: Subject<void>;
  const api = { addContact: vi.fn() };
  const toaster = { show: vi.fn() };
  const frame = { refresh: vi.fn() };
  let stored: ContactsOutboxEntry[];
  const storage = {
    load: () => stored,
    save: (entries: ContactsOutboxEntry[]) => (stored = entries),
  };

  function outbox(): ContactsOutbox {
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTACTS_API, useValue: api },
        { provide: NETWORK_STATUS, useValue: { online, backOnline$: back } },
        { provide: CONTACTS_OUTBOX_STORAGE, useValue: storage },
        { provide: Toaster, useValue: toaster },
        { provide: ContactsFrame, useValue: frame },
      ],
    });
    return TestBed.inject(ContactsOutbox);
  }

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.resetTestingModule();
    stored = [];
    back = new Subject<void>();
    online = vi.fn(() => false);
  });

  // L2-123 AC4
  it('keeps an add made offline and warns once', () => {
    const box = outbox();
    box.keepAdd(request('Femi'), null);
    box.keepAdd(request('Ada'), null);

    expect(stored.map((e) => e.request.name)).toEqual(['Femi', 'Ada']);
    expect(toaster.show).toHaveBeenCalledTimes(1);
    expect(toaster.show).toHaveBeenCalledWith('warning', OFFLINE_HEADING, OFFLINE_TEXT);
    expect(api.addContact).not.toHaveBeenCalled();
  });

  it('sends what waited in order when the connection returns, with its photo', () => {
    const box = outbox();
    const photo = new File(['x'], 'femi.jpg');
    box.keepAdd(request('Femi'), photo);
    box.keepAdd(request('Ada'), null);
    api.addContact.mockReturnValue(of({}));
    const sent = vi.fn();
    box.sent$.subscribe(sent);

    online.mockReturnValue(true);
    back.next();

    expect(api.addContact.mock.calls.map(([r, p]) => [r.name, p])).toEqual([
      ['Femi', photo],
      ['Ada', null],
    ]);
    expect(stored).toEqual([]);
    expect(frame.refresh).toHaveBeenCalledTimes(2);
    expect(sent).toHaveBeenCalledTimes(2);
  });

  // Known gap 118
  it('sends what a reload found waiting once it is online, without a photo', () => {
    stored = [
      { clientId: 'id-Femi', kind: 'add-contact', request: request('Femi'), state: 'Sending' },
    ];
    online.mockReturnValue(true);
    api.addContact.mockReturnValue(of({}));

    outbox();

    expect(api.addContact).toHaveBeenCalledWith(request('Femi'), null);
    expect(stored).toEqual([]);
  });

  it('keeps a write that could not reach the API waiting', () => {
    const box = outbox();
    box.keepAdd(request('Femi'), null);
    api.addContact.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })));

    online.mockReturnValue(true);
    back.next();

    expect(stored.map((e) => e.state)).toEqual(['Waiting']);
  });

  it('marks a refused write Failed and says so', () => {
    const box = outbox();
    box.keepAdd(request('Femi Bankole'), null);
    api.addContact.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 400 })));

    online.mockReturnValue(true);
    back.next();

    expect(stored.map((e) => e.state)).toEqual(['Failed']);
    expect(toaster.show).toHaveBeenLastCalledWith('danger', 'We couldn’t save Femi.', REFUSED_TEXT);
  });
});
