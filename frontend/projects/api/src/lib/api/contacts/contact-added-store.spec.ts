import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactProfileView } from '../../models/contacts';
import { ContactAddedStore } from './contact-added-store';
import { CONTACTS_API } from './contacts-api';
import { QuickAddSession } from './quick-add-session';

const femiId = '566025c4-1a2b-4c3d-8e9f-0a1b2c3d4e5f';
const femi = { id: femiId, firstName: 'Femi' } as ContactProfileView;

describe('ContactAddedStore', () => {
  let contact: ReturnType<typeof vi.fn>;
  let session: QuickAddSession;
  let store: ContactAddedStore;

  beforeEach(() => {
    contact = vi.fn(() => of(femi));
    TestBed.configureTestingModule({
      providers: [ContactAddedStore, { provide: CONTACTS_API, useValue: { contact } }],
    });
    session = TestBed.inject(QuickAddSession);
    store = TestBed.inject(ContactAddedStore);
  });

  it('shows the contact the session just added with no request, and counts from two', () => {
    session.opened();
    session.added({ ...femi, id: 'other' });
    session.addAnother();
    session.opened();
    session.added(femi);

    store.open(femiId);

    expect(contact).not.toHaveBeenCalled();
    expect(store.contact()).toBe(femi);
    expect(store.count()).toBe('2 people added today');
  });

  it('reads a contact the session did not add, with no count', () => {
    session.added({ ...femi, id: 'other' });
    session.added({ ...femi, id: 'another' });

    store.open(femiId);

    expect(contact).toHaveBeenCalledWith(femiId);
    expect(store.state()).toBe('ready');
    expect(store.count()).toBeNull();
  });

  it('is not found for a contact that is not mine, or an address that names none', () => {
    contact.mockReturnValue(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { code: 'contact_not_found' } }),
      ),
    );

    store.open(femiId);
    expect(store.state()).toBe('notFound');

    store.open('not-an-id');
    expect(store.state()).toBe('notFound');
  });

  it('is failed when the read fails, and reads again on retry', () => {
    contact.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    store.open(femiId);
    expect(store.state()).toBe('failed');
    store.retry();

    expect(store.state()).toBe('ready');
  });
});
