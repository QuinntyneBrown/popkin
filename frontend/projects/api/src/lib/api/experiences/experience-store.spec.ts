import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ExperienceCommentView,
  ExperienceDetailView,
  RatingResultView,
} from '../../models/experiences';
import { ExperienceStore } from './experience-store';
import { EXPERIENCES_API } from './experiences-api';

const face = (initials: string) => ({ initials, accent: 'Leaf', photoUrl: null }) as const;
const counts = (...values: number[]) => values.map((count, i) => ({ stars: 5 - i, count }));
const said = (membershipId: string, firstName: string, stars: number, text: string) =>
  ({
    membershipId,
    firstName,
    avatar: face(firstName.slice(0, 2).toUpperCase()),
    stars,
    text,
    commentedAt: new Date(2026, 8, 12, 9, 0).toISOString(),
  }) as ExperienceCommentView;

function detail(extra: Partial<ExperienceDetailView> = {}): ExperienceDetailView {
  return {
    id: 'canoe',
    kind: 'Did',
    title: 'Sunrise canoe to Heron Point',
    pictureUrl: '/d/canoe.jpg?sig=1',
    emoji: '🏕️',
    colour: 'Teal',
    sharedBy: { membershipId: 'm-mara', firstName: 'Mara', avatar: face('MO') },
    when: 'Sat morning',
    sharedAt: new Date(2026, 8, 12, 7, 0).toISOString(),
    average: 4.8,
    ratingCount: 11,
    keenCount: 0,
    place: 'Heron Point, Lake Ossia',
    score: { average: 4.8, ratingCount: 11, counts: counts(9, 1, 1, 0, 0) },
    myRating: null,
    comments: [
      said('m-walt', 'Walt', 5, 'Saw a heron take off.'),
      said('m-dev', 'Dev', 4, 'Cold.'),
    ],
    canRate: true,
    canEdit: false,
    canDelete: false,
    ...extra,
  };
}

const after = (stars: number): RatingResultView => ({
  stars,
  score: { average: 4.8, ratingCount: 12, counts: counts(10, 1, 1, 0, 0) },
});

describe('ExperienceStore', () => {
  let answer: ExperienceDetailView | 'missing' | 'down' | Subject<ExperienceDetailView>;
  let rated: { stars: number; reply: Subject<RatingResultView> }[];
  let failed: number[];
  let store: ExperienceStore;

  beforeEach(() => {
    answer = detail();
    rated = [];
    failed = [];
    const get = (): Observable<ExperienceDetailView> => {
      if (answer === 'missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      return answer instanceof Subject ? answer : of(answer);
    };
    const rate = (_: string, __: string, stars: number): Observable<RatingResultView> => {
      const reply = new Subject<RatingResultView>();
      rated.push({ stars, reply });
      return reply;
    };
    TestBed.configureTestingModule({
      providers: [ExperienceStore, { provide: EXPERIENCES_API, useValue: { get, rate } }],
    });
    store = TestBed.inject(ExperienceStore);
    store.rateFailed$.subscribe((stars) => failed.push(stars));
  });

  afterEach(() => TestBed.resetTestingModule());

  it('is loading until the experience answers', () => {
    answer = new Subject();
    store.open('p', 'canoe');
    expect(store.state()).toBe('loading');
    expect(store.view()).toBeNull();
  });

  it('is not found for an experience that is not in the Popkin', () => {
    answer = 'missing';
    store.open('p', 'nope');
    expect(store.state()).toBe('not-found');
  });

  it('says so when it did not load, and reads again on retry', () => {
    answer = 'down';
    store.open('p', 'canoe');
    expect(store.state()).toBe('error');
    answer = detail();
    store.retry();
    expect(store.state()).toBe('ready');
  });

  it('shows the experience: what it is, who shared it, where, and its score', () => {
    store.open('p', 'canoe');
    expect(store.view()).toMatchObject({
      kind: 'Something we did',
      when: 'Sat morning',
      title: 'Sunrise canoe to Heron Point',
      pictureUrl: '/d/canoe.jpg?sig=1',
      emoji: '🏕️',
      accent: 'teal',
      sharedBy: 'Shared by Mara',
      avatar: { ...face('MO'), accent: 'leaf' },
      place: 'Heron Point, Lake Ossia',
      score: { value: '4.8', stars: 4.8, label: '4.8 out of 5', count: '11 ratings' },
    });
    expect(store.view()?.score?.bars.map((bar) => bar.percent)).toEqual([100, 11, 11, 0, 0]);
  });

  it('says nobody has rated yet, with empty bars', () => {
    answer = detail({ score: { average: null, ratingCount: 0, counts: counts(0, 0, 0, 0, 0) } });
    store.open('p', 'canoe');
    expect(store.view()?.score).toMatchObject({
      value: '',
      stars: 0,
      label: 'No ratings yet',
      count: 'No ratings yet',
    });
  });

  it('lists what people said, as the API ordered it', () => {
    store.open('p', 'canoe');
    expect(store.view()?.comments).toEqual([
      {
        id: 'm-walt',
        name: 'Walt',
        avatar: { ...face('WA'), accent: 'leaf' },
        stars: 5,
        rated: 'Rated 5',
        text: 'Saw a heron take off.',
      },
      {
        id: 'm-dev',
        name: 'Dev',
        avatar: { ...face('DE'), accent: 'leaf' },
        stars: 4,
        rated: 'Rated 4',
        text: 'Cold.',
      },
    ]);
  });

  it('has no score and no rating panel for something the group wants to do', () => {
    answer = detail({ kind: 'Want', canRate: false });
    store.open('p', 'canoe');
    expect(store.view()?.score).toBeNull();
    expect(store.view()?.panel).toBeNull();
  });

  it('shows the rating of a wrapped-up Popkin without asking for one', () => {
    answer = detail({ canRate: false });
    store.open('p', 'canoe');
    expect(store.view()?.score).not.toBeNull();
    expect(store.view()?.panel).toBeNull();
  });

  describe('the rating panel', () => {
    it('asks a member who has not rated', () => {
      store.open('p', 'canoe');
      expect(store.view()?.panel).toEqual({
        heading: 'How was it for you?',
        stars: 0,
        comment: null,
      });
    });

    it('thanks a member who has rated and offers a comment', () => {
      answer = detail({ myRating: { stars: 4, comment: null } });
      store.open('p', 'canoe');
      expect(store.view()?.panel).toEqual({
        heading: 'Thanks! Your rating',
        stars: 4,
        comment: 'Add a comment',
      });
    });

    it('offers a member who has commented their comment to edit', () => {
      answer = detail({ myRating: { stars: 4, comment: 'Cold.' } });
      store.open('p', 'canoe');
      expect(store.view()?.panel?.comment).toBe('Edit your comment');
      expect(store.commentDraft()).toEqual({
        title: 'Sunrise canoe to Heron Point',
        stars: 4,
        text: 'Cold.',
      });
    });
  });

  describe('rating', () => {
    beforeEach(() => store.open('p', 'canoe'));

    it('fills the stars at once, and keeps asking until it is saved', () => {
      store.rate(5);
      expect(rated.map((r) => r.stars)).toEqual([5]);
      expect(store.view()?.panel).toEqual({
        heading: 'How was it for you?',
        stars: 5,
        comment: null,
      });
      expect(store.view()?.score?.count).toBe('11 ratings');
    });

    it('thanks the member, updates the score and offers a comment once saved', () => {
      store.rate(5);
      rated[0].reply.next(after(5));
      expect(store.view()?.panel).toEqual({
        heading: 'Thanks! Your rating',
        stars: 5,
        comment: 'Add a comment',
      });
      expect(store.view()?.score).toMatchObject({ value: '4.8', count: '12 ratings' });
      expect(failed).toEqual([]);
    });

    it('puts the stars back and says so when it does not save', () => {
      store.rate(5);
      rated[0].reply.error(new HttpErrorResponse({ status: 500 }));
      expect(store.view()?.panel).toEqual({
        heading: 'How was it for you?',
        stars: 0,
        comment: null,
      });
      expect(store.view()?.score?.count).toBe('11 ratings');
      expect(failed).toEqual([5]);
    });

    it('goes back to the rating the member had when a change does not save', () => {
      store.rate(3);
      rated[0].reply.next(after(3));
      store.rate(1);
      rated[1].reply.error(new HttpErrorResponse({ status: 0 }));
      expect(store.view()?.panel?.stars).toBe(3);
      expect(failed).toEqual([1]);
    });

    it('keeps the last choice when two are made quickly', () => {
      store.rate(2);
      store.rate(4);
      rated[0].reply.next(after(2));
      expect(store.view()?.panel?.stars).toBe(4);
      rated[1].reply.next(after(4));
      expect(store.view()?.panel).toMatchObject({ heading: 'Thanks! Your rating', stars: 4 });
    });

    it('does nothing where rating is not offered', () => {
      answer = detail({ canRate: false });
      store.retry();
      store.rate(5);
      expect(rated).toEqual([]);
    });

    it('keeps the comment the member wrote when they change their stars', () => {
      answer = detail({ myRating: { stars: 4, comment: 'Cold.' } });
      store.retry();
      // What the API answers once the rating is saved.
      answer = detail({ myRating: { stars: 5, comment: 'Cold.' } });
      store.rate(5);
      rated[0].reply.next(after(5));
      expect(store.commentDraft()).toMatchObject({ stars: 5, text: 'Cold.' });
    });
  });

  describe('a comment just saved', () => {
    it('goes first under What people said', () => {
      answer = detail({ myRating: { stars: 5, comment: null } });
      store.open('p', 'canoe');
      store.commented(said('m-mara', 'Mara', 5, 'Would do it every morning.'));
      expect(store.view()?.comments.map((c) => c.id)).toEqual(['m-mara', 'm-walt', 'm-dev']);
      expect(store.view()?.panel?.comment).toBe('Edit your comment');
      expect(store.commentDraft()?.text).toBe('Would do it every morning.');
    });

    it('replaces the one the member had', () => {
      answer = detail({
        myRating: { stars: 4, comment: 'Cold.' },
        comments: [said('m-walt', 'Walt', 5, 'Herons.'), said('m-dev', 'Dev', 4, 'Cold.')],
      });
      store.open('p', 'canoe');
      store.commented(said('m-dev', 'Dev', 4, 'Cold, wet, would do it again.'));
      expect(store.view()?.comments.map((c) => [c.id, c.text])).toEqual([
        ['m-dev', 'Cold, wet, would do it again.'],
        ['m-walt', 'Herons.'],
      ]);
    });
  });

  it('reads the experience again after an edit, keeping what is shown meanwhile', () => {
    store.open('p', 'canoe');
    const late = new Subject<ExperienceDetailView>();
    answer = late;
    store.refresh();
    expect(store.state()).toBe('ready');
    expect(store.view()?.title).toBe('Sunrise canoe to Heron Point');
    late.next(detail({ title: 'Twice round the point' }));
    expect(store.view()?.title).toBe('Twice round the point');
  });

  it('reads again after a change of rating by a member who commented, for their comment’s stars', () => {
    answer = detail({
      myRating: { stars: 4, comment: 'Cold.' },
      comments: [said('m-dev', 'Dev', 4, 'Cold.')],
    });
    store.open('p', 'canoe');
    answer = detail({
      myRating: { stars: 5, comment: 'Cold.' },
      comments: [said('m-dev', 'Dev', 5, 'Cold.')],
    });
    store.rate(5);
    rated[0].reply.next(after(5));
    expect(store.state()).toBe('ready');
    expect(store.view()?.comments[0]).toMatchObject({ stars: 5, rated: 'Rated 5' });
  });
});
