import { describe, expect, it } from 'vitest';
import { FollowUpView } from '../../models/contacts';
import {
  doneFollowUps,
  doneText,
  followUpsDueLabel,
  dueText,
  followUpBuckets,
  followUpsSubtitle,
  lateOrDueToday,
  promiseNote,
  showDoneLabel,
} from './follow-ups-text';

/** Tuesday 15 September 2026, the mocks' day. */
const today = new Date(2026, 8, 15, 8, 40);

const followUp = (over: Partial<FollowUpView>): FollowUpView => ({
  id: over.id ?? 'f',
  text: 'Call Sam',
  contactId: null,
  contactFirstName: null,
  contactInitials: null,
  contactAccent: null,
  contactPhotoUrl: null,
  dueOn: null,
  isPromise: false,
  promisedVia: null,
  promisedOn: null,
  createdAt: '2026-09-01T08:00:00Z',
  doneAt: null,
  ...over,
});

describe('Follow-ups (L2-141, L2-142; known gaps 106 and 115, ruled)', () => {
  it.each([
    ['2026-09-13', 'overdue', '2 days late'],
    ['2026-09-14', 'overdue', '1 day late'],
    ['2026-09-15', 'today', 'Today'],
    ['2026-09-16', 'week', 'Wed'],
    ['2026-09-19', 'week', 'Sat'],
    ['2026-09-20', 'later', 'Sep 20'],
    [null, 'later', undefined],
  ])('due %s is %s and reads %s', (dueOn, bucket, text) => {
    const buckets = followUpBuckets([followUp({ dueOn })], today, 'everything');
    expect(buckets.find((b) => b.key === bucket)?.followUps).toHaveLength(1);
    expect(dueText(dueOn, today)).toBe(text);
  });

  it('on a Saturday "This week" is empty and Sunday is later', () => {
    const saturday = new Date(2026, 8, 19);
    const buckets = followUpBuckets([followUp({ dueOn: '2026-09-20' })], saturday, 'everything');
    expect(buckets.map((b) => [b.key, b.followUps.length])).toEqual([['later', 1]]);
  });

  it('leaves done follow-ups out, sorts by day then by when added, with no day last', () => {
    const buckets = followUpBuckets(
      [
        followUp({ id: 'none', dueOn: null }),
        followUp({ id: 'b', dueOn: '2026-09-25', createdAt: '2026-09-02T08:00:00Z' }),
        followUp({ id: 'a', dueOn: '2026-09-25', createdAt: '2026-09-01T08:00:00Z' }),
        followUp({ id: 'c', dueOn: '2026-09-21' }),
        followUp({ id: 'done', dueOn: '2026-09-21', doneAt: '2026-09-10T08:00:00Z' }),
      ],
      today,
      'everything',
    );
    expect(buckets).toEqual([{ key: 'later', heading: 'Later', followUps: expect.any(Array) }]);
    expect(buckets[0].followUps.map((f) => f.id)).toEqual(['c', 'a', 'b', 'none']);
  });

  it('Promises shows only promises, done too', () => {
    const list = [
      followUp({ id: 'p', isPromise: true, dueOn: '2026-09-15' }),
      followUp({ id: 'f', dueOn: '2026-09-15' }),
      followUp({ id: 'pd', isPromise: true, doneAt: '2026-09-09T08:00:00Z' }),
      followUp({ id: 'fd', doneAt: '2026-09-10T08:00:00Z' }),
    ];
    expect(followUpBuckets(list, today, 'promises')[0].followUps.map((f) => f.id)).toEqual(['p']);
    expect(doneFollowUps(list, 'promises').map((f) => f.id)).toEqual(['pd']);
    expect(doneFollowUps(list, 'everything').map((f) => f.id)).toEqual(['fd', 'pd']);
  });

  it('counts the open follow-ups late or due today, for the badge', () => {
    const list = [
      followUp({ dueOn: '2026-09-13' }),
      followUp({ dueOn: '2026-09-15' }),
      followUp({ dueOn: '2026-09-16' }),
      followUp({ dueOn: '2026-09-14', doneAt: '2026-09-14T08:00:00Z' }),
      followUp({ dueOn: null }),
    ];
    expect(lateOrDueToday(list, today)).toBe(2);
    expect(followUpsDueLabel(2)).toBe('2 follow-ups late or due today');
    expect(followUpsDueLabel(1)).toBe('1 follow-up late or due today');
  });

  it.each([
    [8, 6, '8 open · 6 of them promises you made'],
    [3, 1, '3 open · 1 of them a promise you made'],
    [3, 0, '3 open'],
    [0, 0, 'Nothing open'],
  ])('%i open, %i promises, reads %s', (open, promises, text) => {
    expect(followUpsSubtitle(open, promises)).toBe(text);
  });

  it.each([
    ['Messages', '2026-09-03', 'You promised · Messages, Sep 3'],
    ['InPerson', '2026-09-12', 'You promised · In person, Sat'],
    ['Video', '2026-09-11', 'You promised · Video, Sep 11'],
    ['Phone', '2026-09-15', 'You promised · Phone, today'],
  ] as const)('a promise by %s on %s reads %s', (via, on, text) => {
    expect(
      promiseNote(followUp({ isPromise: true, promisedVia: via, promisedOn: on }), today),
    ).toBe(text);
  });

  it('a follow-up that is not a promise has no note', () => {
    expect(promiseNote(followUp({}), today)).toBeUndefined();
  });

  it('reads done and Show done', () => {
    expect(doneText('2026-09-10T15:00:00Z')).toBe('Done Sep 10');
    expect(showDoneLabel(1)).toBe('Show 1 done');
  });

  it('keeps a follow-up ticked since the page opened in its bucket, not under Done', () => {
    const list = [followUp({ id: 't', dueOn: '2026-09-15', doneAt: '2026-09-15T07:40:00Z' })];
    const kept = new Set(['t']);
    expect(followUpBuckets(list, today, 'everything', kept)[0].key).toBe('today');
    expect(doneFollowUps(list, 'everything', kept)).toEqual([]);
    expect(lateOrDueToday(list, today)).toBe(0);
  });
});
