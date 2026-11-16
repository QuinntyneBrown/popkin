import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TimelineItemView } from '../../models/contacts';
import { CONTACTS_API } from './contacts-api';
import { ContactTimelineStore } from './contact-timeline-store';

const call: TimelineItemView = {
  id: 'e1',
  kind: 'Conversation',
  day: '2026-09-06',
  channel: 'Phone',
  milestoneKind: null,
  title: null,
  note: 'Loving the team.',
};

describe('ContactTimelineStore (L2-135)', () => {
  let store: ContactTimelineStore;
  const api = { timeline: vi.fn() };

  beforeEach(() => {
    api.timeline.mockReturnValue(of({ entries: [call] }));
    TestBed.configureTestingModule({
      providers: [ContactTimelineStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(ContactTimelineStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('reads the contact’s entries, all of them at first (AC1)', () => {
    store.open('c1');

    expect(api.timeline).toHaveBeenCalledWith('c1', 'all');
    expect(store.entries()).toEqual([call]);
    expect(store.empty()).toBe(false);
  });

  it('a filter reads again with it (AC1)', () => {
    store.open('c1');
    api.timeline.mockReturnValueOnce(of({ entries: [] }));

    store.choose('milestones');

    expect(api.timeline).toHaveBeenLastCalledWith('c1', 'milestones');
    expect(store.entries()).toEqual([]);
    expect(store.empty()).toBe(false);
  });

  it('nothing logged is empty (AC2)', () => {
    api.timeline.mockReturnValueOnce(of({ entries: [] }));
    store.open('c1');
    expect(store.empty()).toBe(true);
  });

  it('a failed read is failed', () => {
    api.timeline.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.open('c1');
    expect(store.state()).toBe('failed');
  });
});
