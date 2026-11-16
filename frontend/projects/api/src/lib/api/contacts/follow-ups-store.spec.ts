import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowUpView } from '../../models/contacts';
import { Toaster } from '../toasts/toaster';
import { CONTACTS_API } from './contacts-api';
import { FollowUpsStore } from './follow-ups-store';

const ladder: FollowUpView = {
  id: 'f1',
  text: 'Return Ruth’s ladder',
  contactId: 'c1',
  contactFirstName: 'Ruth',
  contactInitials: 'RL',
  contactAccent: 'Teal',
  contactPhotoUrl: null,
  dueOn: '2026-09-15',
  isPromise: true,
  promisedVia: 'InPerson',
  promisedOn: '2026-09-12',
  createdAt: '2026-09-12T10:00:00Z',
  doneAt: null,
};

describe('FollowUpsStore (L2-141, L2-142, L2-124)', () => {
  let store: FollowUpsStore;
  let toaster: Toaster;
  const api = {
    followUps: vi.fn(),
    addFollowUp: vi.fn(),
    setFollowUpDone: vi.fn(),
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 15, 8, 40) });
    api.followUps.mockReturnValue(of([ladder]));
    api.addFollowUp.mockImplementation((r) =>
      of({ ...ladder, id: 'new', text: r.text, contactId: null, isPromise: false, dueOn: null }),
    );
    api.setFollowUpDone.mockImplementation((id: string, done: boolean) =>
      of({ ...ladder, id, doneAt: done ? '2026-09-15T07:40:00Z' : null }),
    );
    TestBed.configureTestingModule({ providers: [{ provide: CONTACTS_API, useValue: api }] });
    store = TestBed.inject(FollowUpsStore);
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('opens with the follow-ups bucketed, counted and the badge (L2-141 AC1)', () => {
    store.open();

    expect(store.state()).toBe('ready');
    expect(store.buckets().map((b) => b.key)).toEqual(['today']);
    expect(store.subtitle()).toBe('1 open · 1 of them a promise you made');
    expect(store.due()).toBe(1);
  });

  it('a failed read is failed, and Try again reads again', () => {
    api.followUps.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.open();
    expect(store.state()).toBe('failed');

    store.open();
    expect(store.state()).toBe('ready');
  });

  it('marking done strikes it through at once and offers Undo (L2-142 AC2, L2-124 AC4)', () => {
    store.open();
    const answer = new Subject<FollowUpView>();
    api.setFollowUpDone.mockReturnValueOnce(answer);

    store.setDone(ladder, true);

    expect(store.followUps()[0].doneAt).not.toBeNull();
    expect(store.buckets()[0].followUps[0].id).toBe('f1');
    expect(store.done()).toEqual([]);
    expect(store.due()).toBe(0);
    const toast = toaster.toasts()[0];
    expect([toast.variant, toast.heading, toast.text, toast.action?.label]).toEqual([
      'success',
      'Marked done',
      'Return Ruth’s ladder.',
      'Undo',
    ]);
    answer.next({ ...ladder, doneAt: '2026-09-15T07:40:00Z' });

    toaster.act(toast);

    expect(api.setFollowUpDone).toHaveBeenLastCalledWith('f1', false);
    expect(store.followUps()[0].doneAt).toBeNull();
  });

  it('a failed tick puts it back with the danger toast, whose Try again sends it again (L2-124 AC3)', () => {
    store.open();
    api.setFollowUpDone.mockReturnValueOnce(throwError(() => new Error('offline')));

    store.setDone(ladder, true);

    expect(store.followUps()[0].doneAt).toBeNull();
    const danger = toaster.toasts().find((t) => t.variant === 'danger')!;
    expect([danger.heading, danger.text, danger.action?.label]).toEqual([
      'We couldn’t save that follow-up',
      'Check your connection and try again.',
      'Try again',
    ]);

    toaster.act(danger);

    expect(api.setFollowUpDone).toHaveBeenCalledTimes(2);
    expect(store.followUps()[0].doneAt).not.toBeNull();
  });

  it('adds a follow-up in a line, for nobody, under Later (L2-142 AC1)', () => {
    store.open();

    store.add('  Call Sam about the reference ');

    expect(api.addFollowUp).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Call Sam about the reference', contactId: null }),
    );
    expect(store.buckets().map((b) => b.key)).toEqual(['today', 'later']);
  });

  it('a failed add takes it off again, and Try again resends under the same client id', () => {
    store.open();
    api.addFollowUp.mockReturnValueOnce(throwError(() => new Error('offline')));

    store.add('Call Sam', 'c1');

    expect(store.followUps()).toHaveLength(1);
    toaster.act(toaster.toasts().find((t) => t.variant === 'danger')!);
    const [first, second] = api.addFollowUp.mock.calls.map(([r]) => r.clientId);
    expect(second).toBe(first);
    expect(store.followUps()).toHaveLength(2);
  });

  it('blank text adds nothing', () => {
    store.open();
    store.add('   ');
    expect(api.addFollowUp).not.toHaveBeenCalled();
  });

  it('a contact’s open follow-ups, soonest first', () => {
    store.open();
    expect(store.forContact('c1').map((f) => f.id)).toEqual(['f1']);
    expect(store.forContact('c2')).toEqual([]);
  });

  it('counts a contact’s follow-ups, open and done, for Delete', () => {
    api.followUps.mockReturnValue(
      of([ladder, { ...ladder, id: 'f2', doneAt: '2026-09-10T08:00:00Z' }]),
    );
    store.open();
    expect(store.countFor('c1')).toBe(2);
  });
});
