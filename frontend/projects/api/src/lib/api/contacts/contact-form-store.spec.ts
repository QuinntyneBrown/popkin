import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactProfileView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import {
  ContactFormStore,
  ContactFormValues,
  contactRequestOf,
  contactValuesOf,
} from './contact-form-store';

const typed: ContactFormValues = {
  name: '  Femi Bankole ',
  knownAs: 'Grace’s fiancé',
  circle: 'Friends',
  phone: '',
  email: 'femi.b@mail.com',
  city: 'London',
  loves: 'Arsenal, jazz brunches, ,',
};

const femi = { id: 'c1', name: 'Femi Bankole', firstName: 'Femi' } as ContactProfileView;

describe('contactRequestOf', () => {
  it('trims the name and splits the things they love at commas (known gap 102)', () => {
    expect(contactRequestOf(typed, 'id-1')).toEqual({
      clientId: 'id-1',
      name: 'Femi Bankole',
      knownAs: 'Grace’s fiancé',
      circle: 'Friends',
      phone: '',
      email: 'femi.b@mail.com',
      city: 'London',
      loves: ['Arsenal', 'jazz brunches'],
    });
  });
});

describe('contactValuesOf', () => {
  it('fills the form from a kept contact, the things they love as one field (L2-130 AC1)', () => {
    const chidi = {
      ...femi,
      name: 'Chidi Okafor',
      knownAs: 'Brother',
      circle: 'Family',
      phone: null,
      email: 'chidi@okafor.dev',
      city: 'Manchester',
      loves: ['Man City', 'Hot sauce collecting'],
    } as ContactProfileView;

    expect(contactValuesOf(chidi)).toEqual({
      name: 'Chidi Okafor',
      knownAs: 'Brother',
      circle: 'Family',
      phone: '',
      email: 'chidi@okafor.dev',
      city: 'Manchester',
      loves: 'Man City, Hot sauce collecting',
    });
  });
});

describe('ContactFormStore', () => {
  let api: {
    addContact: ReturnType<typeof vi.fn>;
    contact: ReturnType<typeof vi.fn>;
    editContact: ReturnType<typeof vi.fn>;
  };
  let store: ContactFormStore;

  beforeEach(() => {
    api = {
      addContact: vi.fn(() => of(femi)),
      contact: vi.fn(() => of(femi)),
      editContact: vi.fn(() => of(femi)),
    };
    TestBed.configureTestingModule({
      providers: [ContactFormStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(ContactFormStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('with no name, sends nothing and is invalid (L2-129 AC4)', () => {
    store.save({ ...typed, name: '   ' }, null);

    expect(store.state()).toBe('invalid');
    expect(api.addContact).not.toHaveBeenCalled();
  });

  it('is saving until the API answers, then holds the contact it saved (L2-123 AC5, L2-129 AC5)', () => {
    const answer = new Subject<ContactProfileView>();
    api.addContact.mockReturnValue(answer);

    store.save(typed, null);
    expect(store.state()).toBe('saving');
    answer.next(femi);

    expect(store.saved()).toEqual(femi);
    expect(store.state()).toBe('idle');
  });

  it('sends the photo picked with the contact', () => {
    const photo = new File(['x'], 'femi.jpg', { type: 'image/jpeg' });

    store.save(typed, photo);

    expect(api.addContact).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Femi Bankole' }),
      photo,
    );
  });

  it('a second Save while saving sends nothing more', () => {
    api.addContact.mockReturnValue(new Subject<ContactProfileView>());

    store.save(typed, null);
    store.save(typed, null);

    expect(api.addContact).toHaveBeenCalledTimes(1);
  });

  it('a failed save is failed, and Save again resends under the same client id (L2-129 AC6)', () => {
    api.addContact.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));

    store.save(typed, null);
    expect(store.state()).toBe('failed');
    store.save(typed, null);

    const [first, second] = api.addContact.mock.calls.map(([request]) => request.clientId);
    expect(second).toBe(first);
    expect(store.saved()).toEqual(femi);
  });

  it('editing, holds the contact read and saves the edit to them, not a new contact (L2-130 AC2)', () => {
    store.edit('c1');
    expect(api.contact).toHaveBeenCalledWith('c1');
    expect(store.editing()).toEqual(femi);

    store.save(typed, null);

    expect(api.addContact).not.toHaveBeenCalled();
    expect(api.editContact).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ name: 'Femi Bankole' }),
    );
    expect(store.saved()).toEqual(femi);
  });

  it('editing, a failed save is failed and keeps the contact being edited', () => {
    api.editContact.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    store.edit('c1');

    store.save(typed, null);

    expect(store.state()).toBe('failed');
    expect(store.editing()).toEqual(femi);
  });
});
