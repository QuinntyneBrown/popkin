import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdminMe, AdminNotifications } from '../../../../models/admin';
import { fakeAdminNotificationsBackend } from './fake-admin-notifications.interceptor';

describe('fakeAdminNotificationsBackend (ADR 0030)', () => {
  let http: HttpClient;
  let api: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([fakeAdminNotificationsBackend(undefined, 0)])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    api.verify();
    TestBed.resetTestingModule();
  });

  it('answers the notification endpoints without the API', async () => {
    const page = await firstValueFrom(http.get<AdminNotifications>('/api/admin/notifications'));
    expect(page.groups).toHaveLength(3);
  });

  it('adds the notification actions to the signed-in admin, then acts as them', async () => {
    const me = firstValueFrom(http.get<AdminMe>('/api/admin/me'));
    api
      .expectOne('/api/admin/me')
      .flush({ adminId: 'a', name: 'Aiko Tanaka', email: '', role: 'Support', allowed: [] });
    expect((await me).allowed).toEqual(['HoldNotifications']);

    await expect(
      firstValueFrom(http.post('/api/admin/notifications/pause', { reason: 'why' })),
    ).rejects.toMatchObject({ status: 403, error: { code: 'role_not_allowed' } });
  });

  it('passes every other request on to the API', async () => {
    const features = firstValueFrom(http.get('/api/admin/features'));
    api.expectOne('/api/admin/features').flush({ features: [] });
    expect(await features).toEqual({ features: [] });
  });
});
