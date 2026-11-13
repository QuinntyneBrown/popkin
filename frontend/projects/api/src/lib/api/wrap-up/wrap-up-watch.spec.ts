import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopkinHomeView } from '../../models/home';
import { POPKINS_API } from '../popkins/popkins-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { WrapUpWatch } from './wrap-up-watch';

const sixPm = new Date(2026, 8, 13, 18, 0);

describe('WrapUpWatch', () => {
  let status: 'Active' | 'WrappedUp' | 'down';
  let asked: string[];
  let hub: Subject<string>;
  let heard: string[];
  let watch: WrapUpWatch;

  beforeEach(() => {
    vi.useFakeTimers({ now: new Date(2026, 8, 13, 17, 58) });
    status = 'Active';
    asked = [];
    hub = new Subject();
    heard = [];
    const getHome = (popkinId: string) => {
      asked.push(popkinId);
      return status === 'down'
        ? throwError(() => new HttpErrorResponse({ status: 500 }))
        : of({ id: popkinId, status } as PopkinHomeView);
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: POPKINS_API, useValue: { getHome } },
        { provide: POPKIN_REALTIME, useValue: { popkinWrappedUp$: hub } },
      ],
    });
    watch = TestBed.inject(WrapUpWatch);
    watch.wrappedUp$.subscribe((popkinId) => heard.push(popkinId));
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('says so when the hub tells that a Popkin wrapped up', () => {
    hub.next('lakeside');
    expect(heard).toEqual(['lakeside']);
  });

  it('says so when a screen reports it', () => {
    watch.report('lakeside');
    expect(heard).toEqual(['lakeside']);
  });

  it('asks nothing while the Popkin it looks at has time left', () => {
    watch.look('lakeside', sixPm.toISOString());
    vi.advanceTimersByTime(90_000);
    expect(asked).toEqual([]);
    expect(heard).toEqual([]);
  });

  it('reads the Popkin once its time is up, and says so when it has wrapped up', () => {
    watch.look('lakeside', sixPm.toISOString());
    vi.advanceTimersByTime(150_000);
    expect(asked).toEqual(['lakeside']);
    expect(heard).toEqual([]);
    status = 'WrappedUp';
    vi.advanceTimersByTime(30_000);
    expect(heard).toEqual(['lakeside']);
  });

  it('stops asking once it has wrapped up', () => {
    status = 'WrappedUp';
    watch.look('lakeside', sixPm.toISOString());
    vi.advanceTimersByTime(600_000);
    expect(asked).toEqual(['lakeside']);
    expect(heard).toEqual(['lakeside']);
  });

  it('keeps asking through a failure', () => {
    status = 'down';
    watch.look('lakeside', sixPm.toISOString());
    vi.advanceTimersByTime(150_000);
    status = 'WrappedUp';
    vi.advanceTimersByTime(30_000);
    expect(asked).toEqual(['lakeside', 'lakeside']);
    expect(heard).toEqual(['lakeside']);
  });

  it('never asks about a Popkin that keeps going', () => {
    watch.look('thursday', null);
    vi.advanceTimersByTime(3_600_000);
    expect(asked).toEqual([]);
  });

  it('looks at one Popkin at a time, and at none once told so', () => {
    watch.look('lakeside', sixPm.toISOString());
    watch.look('thursday', null);
    vi.advanceTimersByTime(600_000);
    watch.look('lakeside', sixPm.toISOString());
    watch.look(null, null);
    vi.advanceTimersByTime(600_000);
    expect(asked).toEqual([]);
  });

  it('takes a later end from the screen that knows it', () => {
    watch.look('lakeside', sixPm.toISOString());
    watch.look('lakeside', new Date(2026, 8, 13, 20, 0).toISOString());
    vi.advanceTimersByTime(600_000);
    expect(asked).toEqual([]);
  });

  describe('the last hour', () => {
    it('warns for the Popkin that has an hour or less, redrawn as the time goes', () => {
      vi.setSystemTime(new Date(2026, 8, 13, 16, 59, 30));
      const warning = () => watch.warningFor('lakeside', 'Lakeside Weekend', sixPm.toISOString());
      expect(warning()).toBeNull();
      vi.advanceTimersByTime(30_000);
      expect(warning()).toEqual({
        lead: '1 hour left.',
        text: 'Lakeside Weekend wraps up at 6 pm.',
      });
      vi.advanceTimersByTime(18 * 60_000);
      expect(warning()?.lead).toBe('42 min left.');
    });

    it('stays away once dismissed, for that Popkin only', () => {
      watch.dismissWarning('lakeside');
      expect(watch.warningFor('lakeside', 'Lakeside Weekend', sixPm.toISOString())).toBeNull();
      expect(watch.warningFor('other', 'Other', sixPm.toISOString())?.lead).toBe('2 min left.');
    });
  });
});
