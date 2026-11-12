import { HttpErrorResponse } from '@angular/common/http';

/** A refusal or failure as a page branches on it: the status and the API's `code`. */
export interface ApiProblem {
  /** 0 when the request never reached the API (offline, aborted). */
  status: number;
  code?: string;
  field?: string;
  retryAfterSeconds?: number;
  /** Any other extension the API sent, such as `attemptsLeft`. */
  extensions: Record<string, unknown>;
}

export function toApiProblem(error: unknown): ApiProblem {
  if (!(error instanceof HttpErrorResponse)) return { status: 0, extensions: {} };
  const body = (typeof error.error === 'object' && error.error) || {};
  const header = Number(error.headers?.get('retry-after'));
  const retryAfterSeconds =
    typeof body['retryAfterSeconds'] === 'number'
      ? body['retryAfterSeconds']
      : Number.isFinite(header) && header > 0
        ? header
        : undefined;
  return {
    status: error.status,
    code: typeof body['code'] === 'string' ? body['code'] : undefined,
    field: typeof body['field'] === 'string' ? body['field'] : undefined,
    retryAfterSeconds,
    extensions: body,
  };
}

/** "Try again in 35 minutes." from a refusal's `retryAfterSeconds` (L2-053 AC4). */
export function tryAgainIn(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return 'Try again in a little while.';
  if (seconds < 60) return `Try again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `Try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
  const hours = Math.ceil(minutes / 60);
  return `Try again in ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
}
