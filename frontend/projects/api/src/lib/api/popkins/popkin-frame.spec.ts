import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopkinHomeView } from '../../models/home';
import { PopkinFrame } from './popkin-frame';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { WrapUpWatch } from '../wrap-up/wrap-up-watch';
import { POPKINS_API } from './popkins-api';

const lakeside = {
  id: 'p',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
  memberCount: 14,
  status: 'Active',
  viewerRole: 'Member',
  wrappedUpAt: null,
  keepPhotos: true,
  photosRemoveAt: null,
  photosRemovedAt: null,
} as PopkinHomeView;

describe('PopkinFrame', () => {
  let answer: PopkinHomeView | 'down';
  let asked: number;
  let frame: PopkinFrame;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 12, 12, 0) });
    answer = lakeside;
    asked = 0;
    const getHome = () => {
      asked++;
      return answer === 'down'
        ? throwError(() => new HttpErrorResponse({ status: 500 }))
        : of(answer);
    };
    TestBed.configureTestingModule({
      providers: [
        PopkinFrame,
        { provide: POPKINS_API, useValue: { getHome } },
        { provide: POPKIN_REALTIME, useValue: { popkinWrappedUp$: new Subject<string>() } },
      ],
    });
    frame = TestBed.inject(PopkinFrame);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('has the Popkin’s colour, name, members and time left', () => {
    frame.open('p');
    expect(frame.accent()).toBe('teal');
    expect(frame.name()).toBe('Lakeside Weekend');
    expect(frame.emoji()).toBe('🏕️');
    expect(frame.members()).toBe('14 members');
    expect(frame.timeLeft()).toBe('1 day 6 hrs left');
  });

  it('is Popkin’s own colour until the Popkin answers, and if it does not', () => {
    answer = 'down';
    frame.open('p');
    expect(frame.accent()).toBe('coral');
    expect(frame.name()).toBe('');
    expect(frame.timeLeft()).toBeNull();
  });

  it('reads a Popkin once', () => {
    frame.open('p');
    frame.open('p');
    expect(asked).toBe(1);
  });

  it('reads again for another Popkin, and after a failure', () => {
    frame.open('p');
    frame.open('q');
    expect(asked).toBe(2);

    answer = 'down';
    frame.open('r');
    frame.open('r');
    expect(asked).toBe(4);
  });

  describe('wrapping up', () => {
    it('is active, with no warning, a day before its end', () => {
      frame.open('p');
      expect(frame.wrappedUp()).toBe(false);
      expect(frame.isHost()).toBe(false);
      expect(frame.warning()).toBeNull();
      expect(frame.wrappedUpOn()).toBeNull();
    });

    it('warns in its last hour, and the Host may change how long it lasts', () => {
      vi.setSystemTime(new Date(2026, 8, 13, 17, 18));
      answer = { ...lakeside, viewerRole: 'Host' };
      frame.open('p');
      expect(frame.warning()).toEqual({
        lead: '42 min left.',
        text: 'Lakeside Weekend wraps up at 6 pm.',
      });
      expect(frame.isHost()).toBe(true);
      frame.dismissWarning();
      expect(frame.warning()).toBeNull();
    });

    it('has the watch look at the Popkin while it is active', () => {
      const look = vi.spyOn(TestBed.inject(WrapUpWatch), 'look');
      frame.open('p');
      expect(look).toHaveBeenLastCalledWith('p', lakeside.endsAt);
    });

    it('knows a wrapped-up Popkin, when it wrapped up and what became of its photos', () => {
      const look = vi.spyOn(TestBed.inject(WrapUpWatch), 'look');
      answer = {
        ...lakeside,
        status: 'WrappedUp',
        wrappedUpAt: new Date(2026, 8, 13, 18, 0).toISOString(),
        keepPhotos: false,
        photosRemoveAt: new Date(2026, 8, 24, 12, 0).toISOString(),
      };
      frame.open('p');
      expect(frame.wrappedUp()).toBe(true);
      expect(frame.wrappedUpOn()).toBe('Wrapped up Sun 13 Sep');
      expect(frame.timeLeft()).toBeNull();
      expect(frame.warning()).toBeNull();
      expect(frame.photosGo()?.lead).toBe('Photos go in 12 days.');
      expect(frame.photosRemoved()).toBe(false);
      expect(look).toHaveBeenLastCalledWith(null, null);
    });

    it('says the photos were removed', () => {
      answer = {
        ...lakeside,
        status: 'WrappedUp',
        wrappedUpAt: new Date(2026, 7, 1).toISOString(),
        keepPhotos: false,
        photosRemoveAt: new Date(2026, 7, 31).toISOString(),
        photosRemovedAt: new Date(2026, 7, 31).toISOString(),
      };
      frame.open('p');
      expect(frame.photosRemoved()).toBe(true);
      expect(frame.photosGo()).toBeNull();
    });
  });
});
