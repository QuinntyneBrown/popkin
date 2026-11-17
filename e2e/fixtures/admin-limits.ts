import type { Page } from '@playwright/test';
import { recordedBody } from './stubs';

/** One row of Limits, as `GET /api/admin/limits` answers it (L2-117 AC1, L2-176 AC3). */
export interface RecordedLimit {
  limit: string;
  value: number;
  defaultValue: number;
  maxValue: number | null;
  unit: string;
  changedAt: string | null;
  changedByName: string | null;
}

export interface RecordedLimits {
  uploads: RecordedLimit[];
  rates: RecordedLimit[];
  sessions: RecordedLimit[];
}

export interface LimitsWrite {
  changes: { limit: string; value: number }[];
  reason: string;
}

/** Limits as the recording read them: nothing changed yet, the sign-in length at 365 days. */
export const recordedLimits = (): RecordedLimits =>
  structuredClone(recordedBody<RecordedLimits>('GET /api/admin/limits'));

/**
 * Answers saving limits as the API would, from the recorded limits, and records each body.
 * Lena Fischer saves at noon on 14 July.
 */
export async function savesLimits(page: Page): Promise<LimitsWrite[]> {
  const limits = recordedLimits();
  const writes: LimitsWrite[] = [];
  await page.route('**/api/admin/limits', (route) => {
    const request = route.request();
    if (request.method() !== 'PUT') return route.fallback();
    const body = request.postDataJSON() as LimitsWrite;
    writes.push(body);
    for (const change of body.changes) {
      const row = limits.sessions.find((l) => l.limit === change.limit);
      if (!row) continue;
      row.value = change.value;
      row.changedAt = new Date(2026, 6, 14, 12, 0).toISOString();
      row.changedByName = 'Lena Fischer';
    }
    return route.fulfill({ json: limits });
  });
  return writes;
}
