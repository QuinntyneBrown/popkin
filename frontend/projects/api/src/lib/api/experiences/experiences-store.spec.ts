import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ExperienceCardView, ExperienceFilter } from '../../models/experiences';
import { EXPERIENCES_API } from './experiences-api';
import { ExperiencesStore } from './experiences-store';

const avatar = { initials: 'MO', accent: 'Coral', photoUrl: '/a/mara.jpg?sig=1' } as const;

function card(id: string, extra: Partial<ExperienceCardView> = {}): ExperienceCardView {
  return {
    id,
    kind: 'Did',
    title: 'Sunrise canoe to Heron Point',
    pictureUrl: `/t/${id}.jpg?sig=1`,
    emoji: '🏕️',
    colour: 'Teal',
    sharedBy: { membershipId: 'm-mara', firstName: 'Mara', avatar },
    when: 'Sat morning',
    sharedAt: new Date(2026, 8, 12, 7, 0).toISOString(),
    average: 4.8,
    ratingCount: 11,
    keenCount: 0,
    ...extra,
  };
}

const canoe = card('canoe');
const tacos = card('tacos', { kind: 'Restaurant', title: 'La Paloma Taqueria', pictureUrl: null });
const beach = card('beach', {
  kind: 'Want',
  title: 'Beach day next summer?',
  when: null,
  average: null,
  ratingCount: 0,
  keenCount: 7,
});

describe('ExperiencesStore', () => {
  type Answer = ExperienceCardView[] | 'down' | 'missing' | Subject<ExperienceCardView[]>;
  let answers: Record<ExperienceFilter, Answer>;
  let asked: ExperienceFilter[];
  let store: ExperiencesStore;

  beforeEach(() => {
    answers = { all: [canoe, tacos, beach], did: [canoe, tacos], want: [beach] };
    asked = [];
    const list = (_: string, filter: ExperienceFilter): Observable<ExperienceCardView[]> => {
      asked.push(filter);
      const answer = answers[filter];
      if (answer === 'down') return throwError(() => new HttpErrorResponse({ status: 500 }));
      if (answer === 'missing') return throwError(() => new HttpErrorResponse({ status: 404 }));
      return answer instanceof Subject ? answer : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [ExperiencesStore, { provide: EXPERIENCES_API, useValue: { list } }],
    });
    store = TestBed.inject(ExperiencesStore);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('is loading until the experiences answer', () => {
    answers.all = new Subject();
    store.open('p', 'all');
    expect(store.state()).toBe('loading');
  });

  it('shows each experience as a card, in the order the API gave', () => {
    store.open('p', 'all');
    expect(store.state()).toBe('ready');
    expect(store.cards()).toEqual([
      {
        id: 'canoe',
        tag: 'Something we did',
        title: 'Sunrise canoe to Heron Point',
        pictureUrl: '/t/canoe.jpg?sig=1',
        emoji: '🏕️',
        accent: 'teal',
        avatar: { ...avatar, accent: 'coral' },
        by: 'Mara · Sat morning',
        rating: { average: '4.8', count: '11', label: 'Rated 4.8 out of 5 by 11' },
        keen: null,
      },
      {
        id: 'tacos',
        tag: 'Restaurant',
        title: 'La Paloma Taqueria',
        pictureUrl: null,
        emoji: '🏕️',
        accent: 'teal',
        avatar: { ...avatar, accent: 'coral' },
        by: 'Mara · Sat morning',
        rating: { average: '4.8', count: '11', label: 'Rated 4.8 out of 5 by 11' },
        keen: null,
      },
      {
        id: 'beach',
        tag: 'Want to do',
        title: 'Beach day next summer?',
        pictureUrl: '/t/beach.jpg?sig=1',
        emoji: '🏕️',
        accent: 'teal',
        avatar: { ...avatar, accent: 'coral' },
        by: 'Mara · Idea',
        rating: null,
        keen: '7 keen',
      },
    ]);
  });

  it('shows no rating on something nobody has rated', () => {
    answers.all = [card('new', { average: null, ratingCount: 0 })];
    store.open('p', 'all');
    expect(store.cards()[0]).toMatchObject({ rating: null, keen: null });
  });

  it('asks for the filter it was opened with and marks it', () => {
    store.open('p', 'did');
    expect(asked).toEqual(['did']);
    expect(store.filter()).toBe('did');
    expect(store.cards().map((c) => c.id)).toEqual(['canoe', 'tacos']);
  });

  it('is empty for a Popkin with no experiences, and explains them', () => {
    answers.all = [];
    store.open('p', 'all');
    expect(store.state()).toBe('empty');
    expect(store.nothing().heading).toBe('Nothing shared yet');
  });

  it('has no results for a filter with nothing in it', () => {
    answers.want = [];
    store.open('p', 'want');
    expect(store.state()).toBe('no-results');
    expect(store.nothing().heading).toBe('Nothing on the wish list');
  });

  it('says so when the experiences did not load, and reads again on retry', () => {
    answers.all = 'down';
    store.open('p', 'all');
    expect(store.state()).toBe('error');
    answers.all = [canoe];
    store.retry();
    expect(store.state()).toBe('ready');
    expect(asked).toEqual(['all', 'all']);
  });

  it('is not found for someone who is not a member of the Popkin', () => {
    answers.all = 'missing';
    store.open('p', 'all');
    expect(store.state()).toBe('not-found');
  });

  it('shows the filter chosen last when an earlier answer comes late', () => {
    const late = new Subject<ExperienceCardView[]>();
    answers.all = late;
    store.open('p', 'all');
    store.open('p', 'want');
    late.next([canoe, tacos]);
    expect(store.cards().map((c) => c.id)).toEqual(['beach']);
  });

  describe('an experience just shared', () => {
    it('goes first in the list', () => {
      store.open('p', 'all');
      expect(store.added(card('bonfire', { title: 'Bonfire songs on the beach' }))).toBe(true);
      expect(store.cards().map((c) => c.id)).toEqual(['bonfire', 'canoe', 'tacos', 'beach']);
    });

    it('makes an empty list ready', () => {
      answers.all = [];
      store.open('p', 'all');
      store.added(canoe);
      expect(store.state()).toBe('ready');
    });

    it.each([
      ['did', canoe, true],
      ['did', tacos, true],
      ['did', beach, false],
      ['want', beach, true],
      ['want', canoe, false],
    ] as const)('under the filter %s, %o is shown: %s', (filter, shared, shown) => {
      answers[filter] = [];
      store.open('p', filter);
      expect(store.added(shared)).toBe(shown);
      expect(store.cards()).toHaveLength(shown ? 1 : 0);
    });
  });
});
