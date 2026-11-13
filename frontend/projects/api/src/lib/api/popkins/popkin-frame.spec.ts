import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopkinHomeView } from '../../models/home';
import { PopkinFrame } from './popkin-frame';
import { POPKINS_API } from './popkins-api';

const lakeside = {
  id: 'p',
  name: 'Lakeside Weekend',
  emoji: '🏕️',
  colour: 'Teal',
  endsAt: new Date(2026, 8, 13, 18, 0).toISOString(),
  memberCount: 14,
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
      providers: [PopkinFrame, { provide: POPKINS_API, useValue: { getHome } }],
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
});
