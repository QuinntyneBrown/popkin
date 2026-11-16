import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONTACTS_API } from './contacts-api';
import { LogEntryStore } from './log-entry-store';

const saved = {
  entry: {
    id: 'e1',
    kind: 'Conversation',
    day: '2026-09-15',
    channel: 'Phone',
    milestoneKind: null,
    title: null,
    note: 'Arup',
  },
  keyDateId: null,
};

describe('LogEntryStore (L2-133, L2-134)', () => {
  let store: LogEntryStore;
  const api = {
    logConversation: vi.fn(),
    logMilestone: vi.fn(),
    reminderPreferences: vi.fn(),
  };
  const opened = new Date(2026, 8, 15, 8, 40);

  beforeEach(() => {
    api.logConversation.mockReturnValue(of(saved));
    api.logMilestone.mockReturnValue(of(saved));
    api.reminderPreferences.mockReturnValue(
      of({
        birthdayLead: 'OneWeekBefore',
        anniversaryLead: 'ThreeDaysBefore',
        milestoneLead: 'OnTheDay',
        phoneNotifications: true,
        mondayEmail: true,
      }),
    );
    TestBed.configureTestingModule({
      providers: [LogEntryStore, { provide: CONTACTS_API, useValue: api }],
    });
    store = TestBed.inject(LogEntryStore);
    store.open('Chidi', 'conversation', opened);
  });

  afterEach(() => {
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('nothing written: Save sends nothing and names the fix (L2-133 AC4)', () => {
    expect(store.problems()).toEqual([]);

    expect(store.save('c1')).toBeNull();

    expect(api.logConversation).not.toHaveBeenCalled();
    expect(store.problems().map((p) => [p.message, p.error])).toEqual([
      [
        'What did you talk about: write a line or two, so you remember it later.',
        'Write a line or two, so you remember it later.',
      ],
    ]);
  });

  it('saves the conversation at the moment Log opened, with its promises (L2-133 AC2)', () => {
    store.channel.set('Phone');
    store.note.set('  Arup ');
    store.addPromise({ text: 'Send the checklist', dueOn: '2026-09-17' });
    store.addPromise({ text: 'Ring the clinic', dueOn: '2026-09-16' });
    store.removePromise(1);

    store.save('c1')?.subscribe();

    expect(api.logConversation).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        channel: 'Phone',
        note: 'Arup',
        loggedAt: expect.stringMatching(/^2026-09-15T08:40:00[+-]\d\d:\d\d$/),
        promises: [{ text: 'Send the checklist', dueOn: '2026-09-17' }],
      }),
    );
  });

  it('a failed save keeps every field, and Save sends again under the same id (L2-133 AC6)', () => {
    api.logConversation.mockReturnValueOnce(throwError(() => new Error('offline')));
    store.note.set('Arup');

    store.save('c1')?.subscribe({ error: () => undefined });

    expect(store.state()).toBe('failed');
    expect(store.note()).toBe('Arup');
    store.save('c1')?.subscribe();
    const [first, second] = api.logConversation.mock.calls.map(([, r]) => r.clientId);
    expect(second).toBe(first);
    expect(store.state()).toBe('idle');
  });

  it('a milestone needs what happened and when (gap 106, ruled)', () => {
    store.choose('milestone');
    store.happenedOn.set('');

    expect(store.save('c1')).toBeNull();

    expect(store.problems().map((p) => p.fieldId)).toEqual(['what', 'when']);
  });

  it('a yearly milestone names its date and the Milestones lead (L2-134 AC2)', () => {
    store.choose('milestone');
    store.title.set('Started at Arup');

    expect(store.yearlyHint()).toBe(
      'Adds “Chidi’s work anniversary” to your dates, with a nudge on the day.',
    );
    store.save('c1')?.subscribe();
    expect(api.logMilestone).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        kind: 'NewJob',
        title: 'Started at Arup',
        happenedOn: '2026-09-15',
        note: null,
        everyYear: true,
      }),
    );
  });
});
