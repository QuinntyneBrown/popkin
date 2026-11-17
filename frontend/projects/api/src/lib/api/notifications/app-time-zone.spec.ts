import { EnvironmentInjector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SessionView } from '../../models/auth';
import { SessionStore } from '../auth/session.store';
import { AppTimeZone, deviceTimeZone } from './app-time-zone';
import { NOTIFICATIONS_API } from './notifications-api';

describe('AppTimeZone (L2-161 AC7)', () => {
  const session = signal<SessionView | null>(null);
  const api = { saveTimeZone: vi.fn(() => of(undefined)) };

  beforeEach(() => {
    session.set(null);
    api.saveTimeZone.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: NOTIFICATIONS_API, useValue: api },
        { provide: SessionStore, useValue: { session } },
      ],
    });
    runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      TestBed.inject(AppTimeZone).start(),
    );
  });

  it('saves nothing before anyone is signed in', () => {
    TestBed.tick();

    expect(api.saveTimeZone).not.toHaveBeenCalled();
  });

  it('saves the device’s zone once a session is known, and once only', () => {
    session.set({ personId: 'p', name: 'Mara', photoUrl: null } as SessionView);
    TestBed.tick();
    session.set({ personId: 'p', name: 'Mara Okafor', photoUrl: null } as SessionView);
    TestBed.tick();

    expect(api.saveTimeZone).toHaveBeenCalledExactlyOnceWith(deviceTimeZone());
  });
});
