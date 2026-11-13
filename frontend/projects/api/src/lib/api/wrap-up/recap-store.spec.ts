import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AlbumExportView, RecapView } from '../../models/recap';
import { RECAP_API } from './recap-api';
import { RecapStore } from './recap-store';

const face = (initials: string) => ({ initials, accent: 'Leaf', photoUrl: null }) as const;

function recap(extra: Partial<RecapView> = {}): RecapView {
  return {
    id: 'p',
    name: 'Lakeside Weekend',
    emoji: '🏕️',
    colour: 'Teal',
    startedAt: new Date(2026, 8, 11, 16, 0).toISOString(),
    wrappedUpAt: new Date(2026, 8, 13, 18, 0).toISOString(),
    keepPhotos: true,
    photosRemoveAt: null,
    photosRemovedAt: null,
    isHost: false,
    peopleCount: 14,
    messageCount: 1286,
    photoCount: 48,
    photos: [
      { id: 'a', thumbnailUrl: '/t/a' },
      { id: 'b', thumbnailUrl: '/t/b' },
      { id: 'c', thumbnailUrl: '/t/c' },
    ],
    avatars: [face('MO'), face('WB'), face('DP'), face('RL')],
    topRated: {
      experienceId: 'canoe',
      title: 'Sunrise canoe to Heron Point',
      average: 4.7,
      ratingCount: 11,
      sharedBy: { firstName: 'Mara' },
    },
    ...extra,
  };
}

const zip = (extra: Partial<AlbumExportView> = {}): AlbumExportView => ({
  id: 'x',
  status: 'Preparing',
  photosDone: 0,
  photosTotal: 48,
  downloadUrl: null,
  ...extra,
});

const refused = (status: number, code?: string) =>
  throwError(() => new HttpErrorResponse({ status, error: code ? { code } : null }));

describe('RecapStore', () => {
  let answer: RecapView | 'missing' | 'active' | 'down' | Subject<RecapView>;
  let started: AlbumExportView | 'down';
  let progress: (AlbumExportView | 'down')[];
  let polled: number;
  let downloads: string[];
  let failures: number;
  let store: RecapStore;

  const getRecap = (): Observable<RecapView> => {
    if (answer === 'missing') return refused(404, 'popkin_not_found');
    if (answer === 'active') return refused(409, 'popkin_active');
    if (answer === 'down') return refused(500);
    return answer instanceof Subject ? answer : of(answer);
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 13, 18, 30) });
    answer = recap();
    started = zip();
    progress = [];
    polled = 0;
    downloads = [];
    failures = 0;
    TestBed.configureTestingModule({
      providers: [
        RecapStore,
        {
          provide: RECAP_API,
          useValue: {
            getRecap,
            startAlbumExport: () => (started === 'down' ? refused(500) : of(started)),
            getAlbumExport: () => {
              polled++;
              const next = progress.shift() ?? zip();
              return next === 'down' ? refused(500) : of(next);
            },
          },
        },
      ],
    });
    store = TestBed.inject(RecapStore);
    store.download$.subscribe((url) => downloads.push(url));
    store.exportFailed$.subscribe(() => failures++);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('is loading until the recap arrives', () => {
    answer = new Subject();
    store.open('p');
    expect(store.state()).toBe('loading');
    expect(store.view()).toBeNull();
  });

  it('says what happened, in the words of the recap', () => {
    store.open('p');
    expect(store.state()).toBe('ready');
    expect(store.view()).toEqual({
      name: 'Lakeside Weekend',
      emoji: '🏕️',
      accent: 'teal',
      line: 'Lakeside Weekend · Fri 11 – Sun 13 Sep',
      photos: ['/t/a', '/t/b', '/t/c'],
      avatars: recap().avatars,
      more: 10,
      people: '14 people showed up',
      stats: [
        { value: '1,286', label: 'messages sent' },
        { value: '48', label: 'photos shared' },
      ],
      topRated: {
        experienceId: 'canoe',
        title: 'Sunrise canoe to Heron Point',
        score: '4.7',
        by: 'shared by Mara',
      },
      isHost: false,
      canSave: true,
      photosGo: null,
    });
  });

  it('leaves the top-rated moment out when nothing was rated', () => {
    answer = recap({ topRated: null });
    store.open('p');
    expect(store.view()?.topRated).toBeNull();
  });

  it('counts nobody more than the faces it shows', () => {
    answer = recap({ peopleCount: 3, avatars: [face('MO'), face('WB'), face('DP')] });
    store.open('p');
    expect(store.view()?.more).toBe(0);
  });

  it('knows the Host', () => {
    answer = recap({ isHost: true });
    store.open('p');
    expect(store.view()?.isHost).toBe(true);
  });

  it('warns while the photos of an album that was not kept are still there', () => {
    answer = recap({
      keepPhotos: false,
      photosRemoveAt: new Date(2026, 8, 25, 18, 30).toISOString(),
    });
    store.open('p');
    expect(store.view()?.photosGo).toEqual({
      lead: 'Photos go in 12 days.',
      text: 'Save the album to keep them.',
    });
    expect(store.view()?.canSave).toBe(true);
  });

  it('offers no album once its photos were removed, or when it never had any', () => {
    answer = recap({
      keepPhotos: false,
      photosRemoveAt: new Date(2026, 9, 13).toISOString(),
      photosRemovedAt: new Date(2026, 9, 13).toISOString(),
      photos: [],
    });
    store.open('p');
    expect(store.view()?.canSave).toBe(false);
    expect(store.view()?.photosGo).toBeNull();
    answer = recap({ photoCount: 0, photos: [] });
    store.retry();
    expect(store.view()?.canSave).toBe(false);
  });

  it.each([
    ['missing', 'not-found'],
    ['active', 'active'],
    ['down', 'error'],
  ] as const)('is %s → %s', (given, state) => {
    answer = given;
    store.open('p');
    expect(store.state()).toBe(state);
  });

  it('reads again on retry', () => {
    answer = 'down';
    store.open('p');
    answer = recap();
    store.retry();
    expect(store.state()).toBe('ready');
  });

  describe('saving the album', () => {
    beforeEach(() => store.open('p'));

    it('shows how far the zip is, asking each second, and downloads it once ready', () => {
      progress = [
        zip({ photosDone: 12 }),
        zip({ status: 'Ready', photosDone: 48, downloadUrl: '/z/x?sig=1' }),
      ];
      store.saveAlbum();
      expect(store.saving()).toEqual({ label: 'Preparing 0 of 48', value: 0, max: 48 });
      vi.advanceTimersByTime(1000);
      expect(store.saving()).toEqual({ label: 'Preparing 12 of 48', value: 12, max: 48 });
      vi.advanceTimersByTime(1000);
      expect(store.saving()).toBeNull();
      expect(downloads).toEqual(['/z/x?sig=1']);
      vi.advanceTimersByTime(5000);
      expect(polled).toBe(2);
    });

    it('downloads at once a zip that was already prepared', () => {
      started = zip({ status: 'Ready', photosDone: 48, downloadUrl: '/z/x?sig=2' });
      store.saveAlbum();
      expect(downloads).toEqual(['/z/x?sig=2']);
      expect(store.saving()).toBeNull();
      expect(polled).toBe(0);
    });

    it('does not start twice', () => {
      store.saveAlbum();
      store.saveAlbum();
      vi.advanceTimersByTime(1000);
      expect(polled).toBe(1);
    });

    it.each([
      ['it does not start', () => (started = 'down')],
      ['the zip fails', () => (progress = [zip({ status: 'Failed' })])],
      ['its progress cannot be read', () => (progress = ['down'])],
    ])('says so when %s, and can be tried again', (_, arrange) => {
      arrange();
      store.saveAlbum();
      vi.advanceTimersByTime(1000);
      expect(failures).toBe(1);
      expect(store.saving()).toBeNull();
      started = zip({ status: 'Ready', downloadUrl: '/z/x?sig=3' });
      store.saveAlbum();
      expect(downloads).toEqual(['/z/x?sig=3']);
    });
  });
});
