import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoCommentView } from '../../models/photos';
import { PhotoCommentsStore, commentTime } from './photo-comments-store';
import { PHOTOS_API } from './photos-api';

const avatar = { initials: 'WB', accent: 'Leaf', photoUrl: null } as const;

function comment(id: string, extra: Partial<PhotoCommentView> = {}): PhotoCommentView {
  return {
    id,
    author: { membershipId: 'm-walt', firstName: 'Walt', avatar },
    addedAt: new Date(2026, 8, 12, 7, 40).toISOString(),
    text: 'That dock!',
    mine: false,
    ...extra,
  };
}

describe('commentTime', () => {
  const now = new Date(2026, 8, 12, 12, 0);
  it.each([
    ['this morning', new Date(2026, 8, 12, 7, 40), 'Sat 7:40'],
    ['earlier in the week', new Date(2026, 8, 8, 18, 5), 'Tue 6:05'],
    ['over a week ago', new Date(2026, 8, 1, 9, 0), '1 Sep'],
  ])('reads a comment from %s as %s', (_case, at, text) => {
    expect(commentTime(at, now)).toBe(text);
  });
});

describe('PhotoCommentsStore (L2-035)', () => {
  let read: () => Observable<PhotoCommentView[]>;
  let posted: { text: string; answer: Subject<PhotoCommentView> }[];
  let deleted: { id: string; answer: Subject<void> }[];
  let store: PhotoCommentsStore;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    read = () => of([comment('c1'), comment('c2', { text: 'Framing this one' })]);
    posted = [];
    deleted = [];
    const api = {
      getComments: () => read(),
      addComment: (_: string, __: string, text: string) => {
        const answer = new Subject<PhotoCommentView>();
        posted.push({ text, answer });
        return answer;
      },
      deleteComment: (_: string, __: string, id: string) => {
        const answer = new Subject<void>();
        deleted.push({ id, answer });
        return answer;
      },
    };
    TestBed.configureTestingModule({
      providers: [PhotoCommentsStore, { provide: PHOTOS_API, useValue: api }],
    });
    store = TestBed.inject(PhotoCommentsStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('lists the comments oldest first, each with name, time and text (AC1)', () => {
    store.open('p', 'ph', 2);
    expect(store.state()).toBe('ready');
    expect(store.comments().map((c) => [c.name, c.time, c.text])).toEqual([
      ['Walt', 'Sat 7:40', 'That dock!'],
      ['Walt', 'Sat 7:40', 'Framing this one'],
    ]);
    expect(store.title()).toBe('2 comments');
  });

  it('is titled by the count it was opened with until the comments answer', () => {
    read = () => new Subject<PhotoCommentView[]>();
    store.open('p', 'ph', 1);
    expect(store.state()).toBe('loading');
    expect(store.title()).toBe('1 comment');
  });

  it('is titled Comments when there are none (AC4)', () => {
    read = () => of([]);
    store.open('p', 'ph', 0);
    expect(store.state()).toBe('ready');
    expect(store.title()).toBe('Comments');
  });

  it('says so when the comments do not load, and reads them again on Try again', () => {
    read = () => throwError(() => new HttpErrorResponse({ status: 500 }));
    store.open('p', 'ph', 2);
    expect(store.state()).toBe('error');

    read = () => of([comment('c1')]);
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('posts the field, busy until it answers, then adds the comment at the end (AC2)', () => {
    store.open('p', 'ph', 2);
    store.draft.set('  Up at 6 again tomorrow?  ');
    store.post();
    expect(posted.map((p) => p.text)).toEqual(['Up at 6 again tomorrow?']);
    expect(store.posting()).toBe(true);
    expect(store.canPost()).toBe(false);

    posted[0].answer.next(comment('c3', { text: 'Up at 6 again tomorrow?', mine: true }));
    expect(store.posting()).toBe(false);
    expect(store.draft()).toBe('');
    expect(store.comments().at(-1)?.text).toBe('Up at 6 again tomorrow?');
    expect(store.count()).toBe(3);
  });

  it('does not post an empty field', () => {
    store.open('p', 'ph', 2);
    store.draft.set('   ');
    expect(store.canPost()).toBe(false);
    store.post();
    expect(posted).toEqual([]);
  });

  it('keeps the text and says so when a comment does not post', () => {
    store.open('p', 'ph', 2);
    store.draft.set('Up at 6?');
    store.post();
    posted[0].answer.error(new HttpErrorResponse({ status: 500 }));
    expect(store.draft()).toBe('Up at 6?');
    expect(store.postFailed()).toBe(true);
  });

  it.each([
    [449, null],
    [450, '450 / 500'],
    [500, '500 / 500'],
  ])('shows the count near the limit (AC3): %i characters', (length, text) => {
    store.draft.set('a'.repeat(length));
    expect(store.countText()).toBe(text);
  });

  it('removes the member’s own comment once deleted (AC5)', () => {
    read = () => of([comment('c1'), comment('c2', { mine: true })]);
    store.open('p', 'ph', 2);
    store.remove('c2');
    expect(deleted.map((d) => d.id)).toEqual(['c2']);
    expect(store.comments()).toHaveLength(2);

    deleted[0].answer.next();
    deleted[0].answer.complete();
    expect(store.comments().map((c) => c.id)).toEqual(['c1']);
    expect(store.count()).toBe(1);
  });

  it('keeps the comment and says so when it does not delete', () => {
    read = () => of([comment('c2', { mine: true })]);
    store.open('p', 'ph', 1);
    store.remove('c2');
    deleted[0].answer.error(new HttpErrorResponse({ status: 500 }));
    expect(store.comments()).toHaveLength(1);
    expect(store.deleteFailed()).toBe(true);
  });
});
