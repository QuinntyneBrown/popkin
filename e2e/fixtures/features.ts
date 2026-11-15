import type { Page } from '@playwright/test';
import { answer } from './stubs';

/** A feature a Popkin may have, as the API names it (L2-152, L2-153). */
export type ApiFeature = 'Plan' | 'Schedules';

/**
 * Offers a new Popkin these features, `GET /api/popkins/features` (L2-152 AC8). The recording
 * offers both, and `pk-test` reads it as offering neither for the earlier journeys.
 */
export async function offerNewPopkin(page: Page, offered: ApiFeature[]): Promise<void> {
  await answer(page, 'GET /api/popkins/features', { status: 200, body: { offered } });
}
