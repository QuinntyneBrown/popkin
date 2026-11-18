import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactProfileView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { ContactsOutbox } from './contacts-outbox';
import { QuickAddSession } from './quick-add-session';
import { QuickAddStore, QuickAddValues, canQuickAdd, quickAddRequestOf } from './quick-add-store';

const typed: QuickAddValues = {
  name: '  Femi Bankole ',
  phone: '+44 7700 900631',
  knownAs: 'Grace’s fiancé',
  circle: 'Work',
};
const femi = { id: 'femi', name: 'Femi Bankole', firstName: 'Femi' } as ContactProfileView;

describe('canQuickAdd', () => {
  it.each([
    ['', false],
    ['   ', false],
    ['Femi', true],
    ['  Femi ', true],
  ])('a name of %j can be saved: %s (L2-178 AC2)', (name, can) => {
    expect(canQuickAdd(name)).toBe(can);
  });
});

describe('quickAddRequestOf', () => {
  it('trims the name, keeps the phone, who they are and the circle, and leaves the rest empty', () => {
    expect(quickAddRequestOf(typed, 'id-1')).toEqual({
      clientId: 'id-1',
      name: 'Femi Bankole',
      knownAs: 'Grace’s fiancé',
      circle: 'Work',
      phone: '+44 7700 900631',
      email: '',
      city: '',
      howWeMet: '',
      loves: [],
    });
  });
});

describe('QuickAddStore', () => {
  let addContact: ReturnType<typeof vi.fn>;
  let outbox: { offline: ReturnType<typeof vi.fn>; keepAdd: ReturnType<typeof vi.fn> };
  let store: QuickAddStore;

  beforeEach(() => {
    addContact = vi.fn(() => of(femi));
    outbox = { offline: vi.fn(() => false), keepAdd: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        QuickAddStore,
        { provide: CONTACTS_API, useValue: { addContact } },
        { provide: ContactsOutbox, useValue: outbox },
      ],
    });
    store = TestBed.inject(QuickAddStore);
  });

  it('sends nothing for a blank name', () => {
    store.save({ ...typed, name: '  ' }, null);

    expect(addContact).not.toHaveBeenCalled();
  });

  it('is saving until the API answers, then holds the saved contact (L2-178 AC3, AC4)', () => {
    const answer = new Subject<ContactProfileView>();
    addContact.mockReturnValue(answer);

    store.save(typed, null);
    expect(store.state()).toBe('saving');
    answer.next(femi);

    expect(store.state()).toBe('idle');
    expect(store.saved()).toBe(femi);
    expect(TestBed.inject(QuickAddSession).contact('femi')).toBe(femi);
  });

  it('sends nothing more while a save is under way', () => {
    addContact.mockReturnValue(new Subject());

    store.save(typed, null);
    store.save(typed, null);

    expect(addContact).toHaveBeenCalledTimes(1);
  });

  it('sends the photo with the request (L2-179 AC1)', () => {
    const photo = new File(['x'], 'femi.jpg', { type: 'image/jpeg' });

    store.save(typed, photo);

    expect(addContact).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Femi Bankole' }),
      photo,
    );
  });

  it('a failure is failed and a second Save carries the same client id', () => {
    addContact.mockReturnValueOnce(throwError(() => new Error('down')));

    store.save(typed, null);
    expect(store.state()).toBe('failed');
    store.save(typed, null);

    const [first] = addContact.mock.calls[0];
    const [second] = addContact.mock.calls[1];
    expect(second.clientId).toBe(first.clientId);
  });

  it('a success makes a new client id for the next person', () => {
    store.save(typed, null);
    store.save(typed, null);

    const [first] = addContact.mock.calls[0];
    const [second] = addContact.mock.calls[1];
    expect(second.clientId).not.toBe(first.clientId);
  });

  it('offline, keeps the add in the outbox and counts it, with no saved contact (known gap 157)', () => {
    outbox.offline.mockReturnValue(true);

    store.save(typed, null);

    expect(outbox.keepAdd).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Femi Bankole' }),
      null,
    );
    expect(addContact).not.toHaveBeenCalled();
    expect(store.kept()).toBe(1);
    expect(store.saved()).toBeNull();
  });
});
