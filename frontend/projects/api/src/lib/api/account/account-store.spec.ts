import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountView } from '../../models/account';
import { AUTH_API } from '../auth/auth-api';
import { SessionStore } from '../auth/session.store';
import { ACCOUNT_API, AccountApi } from './account-api';
import { AccountStore } from './account-store';

const mara: AccountView = {
  personId: 'p',
  name: 'Mara Okafor',
  photoUrl: null,
  channel: 'Phone',
  destination: '(415) 555-0148',
};

const refused = (code: string) =>
  throwError(() => new HttpErrorResponse({ status: 400, error: { code } }));

describe('AccountStore', () => {
  let api: { [K in keyof AccountApi]: ReturnType<typeof vi.fn> };
  let store: AccountStore;
  let sessions: SessionStore;

  beforeEach(() => {
    vi.useFakeTimers();
    api = {
      getAccount: vi.fn(() => of(mara)),
      updateName: vi.fn((name: string) => of({ ...mara, name })),
      changePhoto: vi.fn(() => of({ ...mara, photoUrl: '/photo' })),
      getDeletionImpact: vi.fn(),
      deleteAccount: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        AccountStore,
        { provide: ACCOUNT_API, useValue: api },
        { provide: AUTH_API, useValue: {} },
      ],
    });
    store = TestBed.inject(AccountStore);
    sessions = TestBed.inject(SessionStore);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('says it is loading only after 300 ms without an answer (L2-056 AC1)', () => {
    const answer = new Subject<AccountView>();
    api.getAccount.mockReturnValue(answer);

    store.load();
    expect(store.state()).toBe('pending');
    vi.advanceTimersByTime(300);
    expect(store.state()).toBe('loading');
    answer.next(mara);

    expect(store.state()).toBe('ready');
    expect(store.account()).toEqual(mara);
  });

  it('says when the account cannot be loaded, and loads again on retry (L2-056 AC2)', () => {
    api.getAccount.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 500 })));

    store.load();
    expect(store.state()).toBe('error');
    store.load();

    expect(store.state()).toBe('ready');
  });

  it('saves nothing for an empty name and marks it invalid (L2-048 AC3)', () => {
    store.load();

    store.save('   ', null);

    expect(store.nameInvalid()).toBe(true);
    expect(api.updateName).not.toHaveBeenCalled();
    expect(store.saveState()).toBe('idle');
  });

  it('saves a trimmed new name, tells the session and says it is saved (L2-048 AC2)', () => {
    store.load();

    store.save(' Mara O. ', null);

    expect(api.updateName).toHaveBeenCalledWith('Mara O.');
    expect(store.saveState()).toBe('saved');
    expect(store.account()?.name).toBe('Mara O.');
    expect(sessions.session()).toEqual({ personId: 'p', name: 'Mara O.', photoUrl: null });
  });

  it('uploads the photo first, then the name only when it changed', () => {
    store.load();
    const photo = new File(['x'], 'me.jpg');

    store.save('Mara Okafor', photo);

    expect(api.changePhoto).toHaveBeenCalledWith(photo);
    expect(api.updateName).not.toHaveBeenCalled();
    expect(store.account()?.photoUrl).toBe('/photo');
    expect(store.saveState()).toBe('saved');
  });

  it('is saving while the request is under way', () => {
    store.load();
    const answer = new Subject<AccountView>();
    api.updateName.mockReturnValue(answer as Observable<AccountView>);

    store.save('Mara O.', null);
    expect(store.saveState()).toBe('saving');
    store.save('Mara O.', null);
    answer.next({ ...mara, name: 'Mara O.' });

    expect(api.updateName).toHaveBeenCalledTimes(1);
    expect(store.saveState()).toBe('saved');
  });

  it('gives the reason a photo is refused, and keeps nothing saved', () => {
    store.load();
    api.changePhoto.mockReturnValue(refused('photo_too_large'));

    store.save('Mara O.', new File(['x'], 'big.jpg'));

    expect(store.photoProblem()).toBe('size');
    expect(api.updateName).not.toHaveBeenCalled();
    expect(store.saveState()).toBe('idle');
  });

  it('says a save failed and is ready to try again', () => {
    store.load();
    api.updateName.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    store.save('Mara O.', null);

    expect(store.saveState()).toBe('failed');
    expect(store.account()?.name).toBe('Mara Okafor');
  });

  it('marks the name invalid when the API refuses it', () => {
    store.load();
    api.updateName.mockReturnValue(refused('name_invalid'));

    store.save('Mara O.', null);

    expect(store.nameInvalid()).toBe(true);
    expect(store.saveState()).toBe('idle');
  });
});
