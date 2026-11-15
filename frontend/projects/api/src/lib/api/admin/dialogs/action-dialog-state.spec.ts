import { HttpErrorResponse } from '@angular/common/http';
import { NEVER, of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { ActionDialogState } from './action-dialog-state';

const refused = (status: number, code: string) =>
  throwError(() => new HttpErrorResponse({ status, error: { code } }));

describe('ActionDialogState', () => {
  it('asks for a reason it requires, and sends nothing (L2-087 AC2)', async () => {
    const state = new ActionDialogState('Required');
    const send = vi.fn(() => of('done'));

    expect(await state.confirm('   ', send)).toBeUndefined();

    expect(send).not.toHaveBeenCalled();
    expect(state.reasonError()).toBe('Give a reason; it goes in the audit log.');
    expect(state.status()).toBe('idle');
  });

  it('sends an optional blank reason as none, and answers what came back', async () => {
    const state = new ActionDialogState('Optional');
    const send = vi.fn(() => of('done'));

    expect(await state.confirm('  ', send)).toBe('done');
    expect(send).toHaveBeenCalledWith(null);
  });

  it('sends the trimmed reason once while busy (L2-087 AC4)', async () => {
    const state = new ActionDialogState('Required');
    const send = vi.fn(() => NEVER);

    void state.confirm(' Left Popkin ', send);
    void state.confirm(' Left Popkin ', send);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('Left Popkin');
    expect(state.status()).toBe('busy');
  });

  it('puts the API’s reason refusal on the field', async () => {
    const state = new ActionDialogState('Required');

    await state.confirm('x', () => refused(400, 'reason_too_long'));

    expect(state.reasonError()).toBe('Keep the reason to 500 characters.');
    expect(state.status()).toBe('idle');
  });

  it('fails with the problem, for the dialog to name (L2-087 AC5)', async () => {
    const state = new ActionDialogState('Optional');

    await state.confirm('x', () => refused(409, 'last_owner'));

    expect(state.status()).toBe('failed');
    expect(state.failure()?.code).toBe('last_owner');
  });
});
