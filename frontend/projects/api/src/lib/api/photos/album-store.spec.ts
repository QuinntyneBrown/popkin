import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumFilter, AlbumPageView, PhotoSummaryView } from '../../models/photos';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { AlbumStore } from './album-store';
import { PHOTOS_API } from './photos-api';

const avatar = { initials: 'WB', accent: 'Leaf', photoUrl: null } as const;

function photo(id: string, takenAt: Date, isMine = false): PhotoSummaryView {
  return {
    id,
    caption: null,
    uploader: { membershipId: isMine ? 'm-mara' : 'm-walt', firstName: 'Walt', avatar },
    takenAt: takenAt.toISOString(),
    addedAt: takenAt.toISOString(),
    thumbnailUrl: `/t/${id}.jpg`,
    width: 480,
    height: 320,
    isMine,
  };
}

const sat = (hour: number) => new Date(2026, 8, 12, hour, 0);
const fri = (hour: number) => new Date(2026, 8, 11, hour, 0);

function page(items: PhotoSummaryView[], extra: Partial<AlbumPageView> = {}): AlbumPageView {
  return {
    photoCount: 48,
    contributorCount: 11,
    contributors: [{ firstName: 'Walt', avatar }],
    items,
    nextCursor: null,
    canAdd: true,
    ...extra,
  };
}

type Answer = AlbumPageView | 'missing' | 'down' | Subject<AlbumPageView>;

/** Answers each read of the album from what it holds, and remembers what was asked. */
class Fake {
  everyone: Answer = page([photo('s2', sat(9)), photo('s1', sat(7)), photo('f1', fri(20))]);
  mine: Answer = page([photo('s1', sat(7), true)]);
  later: Record<string, Answer> = {};
  readonly asked: { filter: AlbumFilter; cursor?: string }[] = [];

  getAlbum = (_: string, filter: AlbumFilter, cursor?: string): Observable<AlbumPageView> => {
    this.asked.push(cursor ? { filter, cursor } : { filter });
    const answer = cursor ? this.later[cursor] : this[filter];
    if (answer === 'missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
    if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
    return answer instanceof Subject ? answer : of(answer);
  };
}

describe('AlbumStore', () => {
  let api: Fake;
  let store: AlbumStore;
  const realtime = {
    state: signal('connected'),
    photosAdded$: new Subject<{ popkinId: string; photoIds: string[] }>(),
    reconnected$: new Subject<void>(),
    started: 0,
    start() {
      this.started++;
    },
  };
  const ids = () => store.days().flatMap((day) => day.photos.map((p) => p.id));

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    api = new Fake();
    realtime.started = 0;
    TestBed.configureTestingModule({
      providers: [
        AlbumStore,
        { provide: PHOTOS_API, useValue: api },
        { provide: POPKIN_REALTIME, useValue: realtime },
      ],
    });
    store = TestBed.inject(AlbumStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  describe('opening', () => {
    it('is loading until the album answers', () => {
      api.everyone = new Subject<AlbumPageView>();
      store.open('p');
      expect(store.state()).toBe('loading');
      expect(realtime.started).toBe(1);
    });

    // L2-032 AC1, AC2
    it('shows the counts and the photos under their days, the latest first', () => {
      store.open('p');
      expect(store.state()).toBe('ready');
      expect(store.line()).toBe('48 photos from 11 people');
      expect(store.days().map((day) => [day.label, day.photos.map((p) => p.id)])).toEqual([
        ['Saturday', ['s2', 's1']],
        ['Friday', ['f1']],
      ]);
      expect(store.days()[0].photos[0].feature).toBe(true);
      expect(store.canAdd()).toBe(true);
    });

    // L2-032 AC5
    it('is empty for a Popkin with no photos', () => {
      api.everyone = page([], { photoCount: 0, contributorCount: 0, contributors: [] });
      store.open('p');
      expect(store.state()).toBe('empty');
    });

    it('says so when the album does not load, and reads again on retry', () => {
      api.everyone = 'down';
      store.open('p');
      expect(store.state()).toBe('error');

      api.everyone = page([photo('s1', sat(7))]);
      store.retry();
      expect(store.state()).toBe('ready');
    });

    // L2-051
    it('is not found for someone who is not a member', () => {
      api.everyone = 'missing';
      store.open('p');
      expect(store.state()).toBe('not-found');
    });

    // L2-045 AC3
    it('offers no Add once the Popkin has wrapped up', () => {
      api.everyone = page([photo('s1', sat(7))], { canAdd: false });
      store.open('p');
      expect(store.canAdd()).toBe(false);
    });
  });

  describe('the filters', () => {
    // L2-032 AC3
    it('Mine shows only the member’s photos, none larger', () => {
      store.open('p');
      store.show('mine');
      expect(store.filter()).toBe('mine');
      expect(ids()).toEqual(['s1']);
      expect(store.days()[0].photos[0].feature).toBe(false);
      expect(store.line()).toBe('48 photos from 11 people');
    });

    it('Everyone shows all again', () => {
      store.open('p');
      store.show('mine');
      store.show('everyone');
      expect(ids()).toEqual(['s2', 's1', 'f1']);
    });

    // L2-032 AC4
    it('Mine with none of the member’s photos has no results', () => {
      api.mine = page([]);
      store.open('p');
      store.show('mine');
      expect(store.state()).toBe('no-results');
    });

    it('keeps the counts while the other filter loads', () => {
      store.open('p');
      api.mine = new Subject<AlbumPageView>();
      store.show('mine');
      expect(store.state()).toBe('loading');
      expect(store.line()).toBe('48 photos from 11 people');
    });

    it('drops the answer of a filter the member has left', () => {
      const slow = new Subject<AlbumPageView>();
      api.mine = slow;
      store.open('p');
      store.show('mine');
      store.show('everyone');
      slow.next(page([photo('s1', sat(7), true)]));
      expect(store.filter()).toBe('everyone');
      expect(ids()).toEqual(['s2', 's1', 'f1']);
    });

    it('does not read again for the filter already shown', () => {
      store.open('p');
      store.show('everyone');
      expect(api.asked).toHaveLength(1);
    });
  });

  // L2-032 AC6
  describe('more photos', () => {
    beforeEach(() => {
      api.everyone = page([photo('s2', sat(9)), photo('s1', sat(7))], { nextCursor: 'c1' });
      api.later['c1'] = page([photo('f1', fri(20)), photo('f0', fri(8))], { nextCursor: null });
    });

    it('adds the next page after what is shown', () => {
      store.open('p');
      expect(store.hasMore()).toBe(true);

      store.more();
      expect(api.asked[1]).toEqual({ filter: 'everyone', cursor: 'c1' });
      expect(ids()).toEqual(['s2', 's1', 'f1', 'f0']);
      expect(store.hasMore()).toBe(false);
      expect(store.moreState()).toBe('idle');
    });

    it('asks once while a page is on its way', () => {
      api.later['c1'] = new Subject<AlbumPageView>();
      store.open('p');
      store.more();
      store.more();
      expect(store.moreState()).toBe('loading');
      expect(api.asked).toHaveLength(2);
    });

    it('asks for nothing at the end of the album', () => {
      store.open('p');
      store.more();
      store.more();
      expect(api.asked).toHaveLength(2);
    });

    it('keeps what is shown when a later page fails, and tries it again', () => {
      api.later['c1'] = 'down';
      store.open('p');
      store.more();
      expect(store.moreState()).toBe('error');
      expect(store.state()).toBe('ready');
      expect(ids()).toEqual(['s2', 's1']);

      api.later['c1'] = page([photo('f1', fri(20))]);
      store.more();
      expect(ids()).toEqual(['s2', 's1', 'f1']);
    });

    it('never shows a photo twice', () => {
      api.later['c1'] = page([photo('s1', sat(7)), photo('f1', fri(20))]);
      store.open('p');
      store.more();
      expect(ids()).toEqual(['s2', 's1', 'f1']);
    });

    it('drops a page that answers after the filter changed', () => {
      const slow = new Subject<AlbumPageView>();
      api.later['c1'] = slow;
      store.open('p');
      store.more();
      store.show('mine');
      slow.next(page([photo('f1', fri(20))]));
      expect(ids()).toEqual(['s1']);
      expect(store.moreState()).toBe('idle');
    });
  });

  // L2-031 AC7
  describe('photos added while the album is open', () => {
    it('appear without a reload, in their place, with the counts', () => {
      store.open('p');
      api.everyone = page(
        [photo('s3', sat(11)), photo('s2', sat(9)), photo('s1', sat(7)), photo('f1', fri(20))],
        { photoCount: 49 },
      );
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['s3'] });

      expect(ids()).toEqual(['s3', 's2', 's1', 'f1']);
      expect(store.line()).toBe('49 photos from 11 people');
    });

    it('keeps the later pages already shown', () => {
      api.everyone = page([photo('s2', sat(9)), photo('s1', sat(7))], { nextCursor: 'c1' });
      api.later['c1'] = page([photo('f1', fri(20))]);
      store.open('p');
      store.more();

      api.everyone = page([photo('s3', sat(11)), photo('s2', sat(9))], { nextCursor: 'c0' });
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['s3'] });

      expect(ids()).toEqual(['s3', 's2', 's1', 'f1']);
      expect(store.hasMore()).toBe(false);
    });

    it('puts a photo taken earlier under its own day', () => {
      store.open('p');
      api.everyone = page([
        photo('s2', sat(9)),
        photo('s1', sat(7)),
        photo('f2', fri(22)),
        photo('f1', fri(20)),
      ]);
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['f2'] });
      expect(ids()).toEqual(['s2', 's1', 'f2', 'f1']);
    });

    it('fill an empty album', () => {
      api.everyone = page([], { photoCount: 0, contributorCount: 0, contributors: [] });
      store.open('p');
      api.everyone = page([photo('s1', sat(7))], { photoCount: 1, contributorCount: 1 });
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['s1'] });
      expect(store.state()).toBe('ready');
      expect(ids()).toEqual(['s1']);
    });

    it('are ignored when they are another Popkin’s', () => {
      store.open('p');
      realtime.photosAdded$.next({ popkinId: 'other', photoIds: ['x'] });
      expect(api.asked).toHaveLength(1);
    });

    it('leave what is shown alone when the read fails', () => {
      store.open('p');
      api.everyone = 'down';
      realtime.photosAdded$.next({ popkinId: 'p', photoIds: ['s3'] });
      expect(store.state()).toBe('ready');
      expect(ids()).toEqual(['s2', 's1', 'f1']);
    });

    it('are read again after the connection comes back', () => {
      store.open('p');
      api.everyone = page([photo('s3', sat(11)), photo('s2', sat(9))], { photoCount: 49 });
      realtime.reconnected$.next();
      expect(ids()).toEqual(['s3', 's2', 's1', 'f1']);
    });

    it('are read again when the member has added some', () => {
      store.open('p');
      store.refresh();
      expect(api.asked).toHaveLength(2);
    });

    it('do not bring back an album that failed to open', () => {
      api.everyone = 'down';
      store.open('p');
      realtime.reconnected$.next();
      expect(store.state()).toBe('error');
      expect(api.asked).toHaveLength(1);
    });
  });
});
