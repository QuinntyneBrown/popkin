import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signedInGuardOf, signedOutGuardOf, unauthorizedInterceptorOf } from './session-guards';

const route = {} as ActivatedRouteSnapshot;
const at = (url: string) => ({ url }) as RouterStateSnapshot;

describe('session guards (L2-007, L2-002 AC3, L2-088 AC4)', () => {
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  const run = <T>(work: () => T): T => TestBed.runInInjectionContext(work);
  const url = (tree: unknown) => router.serializeUrl(tree as UrlTree);

  describe('signedInGuardOf', () => {
    it('lets a person with a session in', async () => {
      const guard = signedInGuardOf(() => Promise.resolve({ personId: 'p' }));

      expect(await run(() => guard(route, at('/popkins')))).toBe(true);
    });

    it('opens sign in without one, with the screen asked for to come back to', async () => {
      const guard = signedInGuardOf(() => Promise.resolve(null));

      const answer = await run(() => guard(route, at('/p/lakeside/chat')));

      expect(url(answer)).toBe('/sign-in?returnUrl=%2Fp%2Flakeside%2Fchat');
    });
  });

  describe('signedOutGuardOf', () => {
    it('lets a person without a session in', async () => {
      const guard = signedOutGuardOf(() => Promise.resolve(null), '/popkins');

      expect(await run(() => guard(route, at('/')))).toBe(true);
    });

    it('sends a person with a session to where they belong', async () => {
      const guard = signedOutGuardOf(() => Promise.resolve({ id: 'a' }), '/');

      expect(url(await run(() => guard(route, at('/sign-in'))))).toBe('/');
    });
  });

  describe('unauthorizedInterceptorOf (L2-007 AC2, L2-078 AC7)', () => {
    let forget: ReturnType<typeof vi.fn<() => void>>;
    let navigate: ReturnType<typeof vi.spyOn>;
    const interceptor = () =>
      unauthorizedInterceptorOf({
        exempt: (requested) => requested.startsWith('/api/auth/'),
        session: () => ({ forget }),
      });
    const send = (requested: string, status: number) =>
      run(() =>
        firstValueFrom(
          interceptor()(new HttpRequest('GET', requested), () =>
            status === 200
              ? of(new HttpResponse({ status }))
              : throwError(() => new HttpErrorResponse({ status, url: requested })),
          ),
        ),
      );

    beforeEach(() => {
      forget = vi.fn<() => void>();
      navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    });

    it('ends the session and opens sign in, with this screen to come back to', async () => {
      await expect(send('/api/popkins', 401)).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(forget).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(['/sign-in'], { queryParams: { returnUrl: '/' } });
    });

    it('leaves a 401 of an exempt request to its screen', async () => {
      await expect(send('/api/auth/codes', 401)).rejects.toBeInstanceOf(HttpErrorResponse);

      expect(forget).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('leaves every other failure, and every answer, alone', async () => {
      await expect(send('/api/popkins', 500)).rejects.toBeInstanceOf(HttpErrorResponse);
      await send('/api/popkins', 200);

      expect(forget).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
