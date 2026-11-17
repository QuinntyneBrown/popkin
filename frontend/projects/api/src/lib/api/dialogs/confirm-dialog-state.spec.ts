import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, Subject, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialogState } from './confirm-dialog-state';

const refused = (status: number, code: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { code } }));

describe('ConfirmDialogState', () => {
  it('is idle until it sends', () => {
    const state = new ConfirmDialogState();

    expect(state.status()).toBe('idle');
    expect(state.busy()).toBe(false);
    expect(state.failed()).toBe(false);
  });

  it('is busy while it sends, and holds its dialog open (L2-056 AC8)', () => {
    const ref = { disableClose: false as boolean | undefined };
    const state = new ConfirmDialogState(ref);

    void state.send(() => NEVER);

    expect(state.busy()).toBe(true);
    expect(ref.disableClose).toBe(true);
  });

  it('sends once while busy (L2-056 AC3)', () => {
    const state = new ConfirmDialogState();
    const send = vi.fn(() => NEVER);

    void state.send(send);
    void state.send(send);

    expect(send).toHaveBeenCalledTimes(1);
  });

  it('answers true once it went through, and lets its dialog close again', async () => {
    const ref = { disableClose: false as boolean | undefined };
    const state = new ConfirmDialogState(ref);
    const answer = new Subject<void>();

    const sent = state.send(() => answer);
    answer.next();
    answer.complete();

    expect(await sent).toBe(true);
    expect(state.status()).toBe('idle');
    expect(ref.disableClose).toBe(false);
  });

  it('answers true for a request that completes with no value, as a 204 does', async () => {
    const state = new ConfirmDialogState();

    expect(await state.send(() => of(undefined))).toBe(true);
  });

  it('fails with the problem, says so, and lets its dialog close again', async () => {
    const ref = { disableClose: false as boolean | undefined };
    const state = new ConfirmDialogState(ref);

    expect(await state.send(() => refused(409, 'popkin_wrapped_up'))).toBe(false);

    expect(state.failed()).toBe(true);
    expect(state.failure()?.code).toBe('popkin_wrapped_up');
    expect(ref.disableClose).toBe(false);
  });

  it('forgets the failure when it sends again', () => {
    const state = new ConfirmDialogState();
    state.failure.set({ status: 500, extensions: {} });
    state.status.set('failed');

    void state.send(() => NEVER);

    expect(state.failure()).toBeNull();
    expect(state.failed()).toBe(false);
  });

  it('treats a problem its dialog takes as done, as when signing out of a session that ended', async () => {
    const state = new ConfirmDialogState();

    const sent = state.send(
      () => refused(401, 'session_ended'),
      (problem) => (problem.status === 401 ? 'done' : 'failed'),
    );

    expect(await sent).toBe(true);
    expect(state.status()).toBe('idle');
  });

  it('leaves a problem its dialog shows elsewhere idle, without failing', async () => {
    const state = new ConfirmDialogState();

    const sent = state.send(
      () => refused(400, 'reason_required'),
      () => 'idle',
    );

    expect(await sent).toBe(false);
    expect(state.status()).toBe('idle');
    expect(state.failure()).toBeNull();
  });
});
