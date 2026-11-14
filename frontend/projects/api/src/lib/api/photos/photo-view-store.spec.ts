import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PhotoDetailView } from '../../models/photos';
import { PhotoReaction } from './photo-reactions';
import { PhotoViewStore } from './photo-view-store';
import { PHOTOS_API } from './photos-api';

const avatar = { initials: 'MO', accent: 'Coral', photoUrl: null } as const;

function detail(id: string, extra: Partial<PhotoDetailView> = {}): PhotoDetailView {
  return {
    id,
    uploader: { membershipId: 'm-mara', firstName: 'Mara', displayName: 'Mara Okafor', avatar },
    addedAt: new Date(2026, 8, 12, 7, 2).toISOString(),
    takenAt: new Date(2026, 8, 12, 6, 58).toISOString(),
    caption: 'First light on the dock.',
    imageUrl: `/d/${id}.jpg?v=1`,
    width: 2048,
    height: 1365,
    reactions: [],
    commentCount: 0,
    previousPhotoId: 'newer',
    nextPhotoId: 'older',
    canDelete: true,
    isMine: true,
    ...extra,
  };
}

describe('PhotoViewStore', () => {
  let answers: Record<string, PhotoDetailView | 'missing' | 'down' | Subject<PhotoDetailView>>;
  let asked: string[];
  let downloads: Subject<{ url: string; expiresAt: string }>[];
  let deletions: Subject<void>[];
  let reacted: { kind: 'add' | 'remove'; emoji: string; answer: Subject<PhotoReaction[]> }[];
  let store: PhotoViewStore;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    answers = { a: detail('a') };
    asked = [];
    reacted = [];
    downloads = [];
    deletions = [];
    const reaction =
      (kind: 'add' | 'remove') =>
      (_: string, __: string, emoji: string): Observable<PhotoReaction[]> => {
        const answer = new Subject<PhotoReaction[]>();
        reacted.push({ kind, emoji, answer });
        return answer;
      };
    const getPhoto = (_: string, id: string): Observable<PhotoDetailView> => {
      asked.push(id);
      const answer = answers[id] ?? 'missing';
      if (answer === 'missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      return answer instanceof Subject ? answer : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        PhotoViewStore,
        {
          provide: PHOTOS_API,
          useValue: {
            getPhoto,
            addReaction: reaction('add'),
            removeReaction: reaction('remove'),
            getDownload: () => {
              const answer = new Subject<{ url: string; expiresAt: string }>();
              downloads.push(answer);
              return answer;
            },
            deletePhoto: () => {
              const answer = new Subject<void>();
              deletions.push(answer);
              return answer;
            },
          },
        },
      ],
    });
    store = TestBed.inject(PhotoViewStore);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('is loading until the photo answers', () => {
    answers['a'] = new Subject<PhotoDetailView>();
    store.open('p', 'a');
    expect(store.state()).toBe('loading');
  });

  // L2-033 AC1
  it('shows who added it and when, with its caption', () => {
    store.open('p', 'a');
    expect(store.state()).toBe('ready');
    expect(store.photo()?.uploader.displayName).toBe('Mara Okafor');
    expect(store.when()).toBe('Saturday, 7:02 am');
    expect(store.name()).toBe('First light on the dock.');
  });

  it('names a photo without a caption by who added it', () => {
    answers['a'] = detail('a', { caption: null });
    store.open('p', 'a');
    expect(store.name()).toBe('Photo by Mara');
  });

  // L2-033 AC3
  it('knows the photos either side', () => {
    store.open('p', 'a');
    expect(store.neighbour('previous')).toBe('newer');
    expect(store.neighbour('next')).toBe('older');
  });

  it('has none at the ends of the album', () => {
    answers['a'] = detail('a', { previousPhotoId: null, nextPhotoId: null });
    store.open('p', 'a');
    expect(store.neighbour('previous')).toBeNull();
    expect(store.neighbour('next')).toBeNull();
  });

  it('shows the next photo opened, dropping a slower answer for the one left', () => {
    const slow = new Subject<PhotoDetailView>();
    answers['a'] = slow;
    answers['b'] = detail('b');
    store.open('p', 'a');
    store.open('p', 'b');
    slow.next(detail('a'));
    expect(store.photo()?.id).toBe('b');
  });

  // L2-033 AC4
  it('says so when the photo does not load, and reads it again on Try again', () => {
    answers['a'] = 'down';
    store.open('p', 'a');
    expect(store.state()).toBe('error');

    answers['a'] = detail('a');
    store.retry();
    expect(store.state()).toBe('ready');
  });

  // L2-033 AC4: an address may have expired, so Try again asks for a fresh one
  it('says so when the image itself fails, and Try again reads a fresh address', () => {
    store.open('p', 'a');
    store.imageFailed();
    expect(store.state()).toBe('error');

    answers['a'] = detail('a', { imageUrl: '/d/a.jpg?v=2' });
    store.retry();
    expect(store.state()).toBe('ready');
    expect(store.photo()?.imageUrl).toBe('/d/a.jpg?v=2');
    expect(asked).toEqual(['a', 'a']);
  });

  // L2-051
  it('is not found for a photo that is not in the Popkin', () => {
    store.open('p', 'gone');
    expect(store.state()).toBe('not-found');
  });

  describe('reactions (L2-034)', () => {
    const heart = { emoji: '❤️', count: 9, mine: false };
    const answered = (index: number, reactions: PhotoReaction[]) => {
      reacted[index].answer.next(reactions);
      reacted[index].answer.complete();
    };
    const failed = (index: number) =>
      reacted[index].answer.error(new HttpErrorResponse({ status: 500 }));

    beforeEach(() => {
      answers['a'] = detail('a', { reactions: [heart] });
      store.open('p', 'a');
    });

    it('shows a reaction at once, then what the server answered', () => {
      store.react('❤️');
      expect(store.reactions()).toEqual([{ ...heart, count: 10, mine: true }]);
      expect(reacted.map((r) => [r.kind, r.emoji])).toEqual([['add', '❤️']]);

      answered(0, [{ ...heart, count: 11, mine: true }]);
      expect(store.reactions()).toEqual([{ ...heart, count: 11, mine: true }]);
    });

    it('takes the member’s own reaction back', () => {
      answers['a'] = detail('a', { reactions: [{ ...heart, count: 10, mine: true }] });
      store.open('p', 'a');
      store.react('❤️');
      expect(store.reactions()).toEqual([heart]);
      expect(reacted.map((r) => r.kind)).toEqual(['remove']);
    });

    it('puts the count back and says so when a reaction fails (AC4)', () => {
      store.react('❤️');
      failed(0);
      expect(store.reactions()).toEqual([heart]);
      expect(store.reactionFailed()).toBe(true);

      store.dismissReactionFailure();
      expect(store.reactionFailed()).toBe(false);
    });

    it('sends a second press only once the first has answered, so the two cannot cross', () => {
      store.react('❤️');
      store.react('❤️');
      expect(store.reactions()).toEqual([heart]);
      expect(reacted).toHaveLength(1);

      answered(0, [{ ...heart, count: 10, mine: true }]);
      expect(reacted.map((r) => r.kind)).toEqual(['add', 'remove']);
      answered(1, [heart]);
      expect(store.reactions()).toEqual([heart]);
    });

    it('keeps a later press when an earlier one fails', () => {
      store.react('❤️');
      store.react('🔥');
      failed(0);
      expect(store.reactions()).toEqual([heart, { emoji: '🔥', count: 1, mine: true }]);
      expect(reacted.map((r) => r.emoji)).toEqual(['❤️', '🔥']);
    });
  });

  describe('Save photo (L2-036 AC1)', () => {
    beforeEach(() => store.open('p', 'a'));

    it('is busy while it asks for the address, then downloads it', () => {
      const clicked: string[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        clicked.push(this.href);
      });
      store.save();
      expect(store.saving()).toBe(true);

      downloads[0].next({ url: 'https://files.test/a.jpg?sig=1', expiresAt: '' });
      downloads[0].complete();
      expect(clicked).toEqual(['https://files.test/a.jpg?sig=1']);
      expect(store.saving()).toBe(false);
    });

    it('says so when it cannot save', () => {
      store.save();
      downloads[0].error(new HttpErrorResponse({ status: 500 }));
      expect(store.saving()).toBe(false);
      expect(store.saveFailed()).toBe(true);
    });
  });

  describe('Delete photo (L2-036 AC2)', () => {
    beforeEach(() => store.open('p', 'a'));

    it('is busy while it deletes, then says it is done', async () => {
      const done = store.remove();
      expect(store.deleting()).toBe(true);
      deletions[0].next();
      deletions[0].complete();
      await expect(done).resolves.toBe(true);
    });

    it('says so when it cannot delete, and keeps the photo', async () => {
      const done = store.remove();
      deletions[0].error(new HttpErrorResponse({ status: 500 }));
      await expect(done).resolves.toBe(false);
      expect(store.deleting()).toBe(false);
      expect(store.deleteFailed()).toBe(true);
      expect(store.state()).toBe('ready');
    });
  });

  it('shows a photo deleted while it is open as removed', () => {
    store.open('p', 'a');
    store.removed('other');
    expect(store.state()).toBe('ready');
    store.removed('a');
    expect(store.state()).toBe('removed');
  });
});
