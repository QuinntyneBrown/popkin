import responses from '../fixtures/api/responses.json';
import { expect, test } from '../fixtures/pk-test';
import { answer } from '../fixtures/stubs';

const created = responses['POST /api/popkins'].body;

// L2-007 AC2: a session that ends while a screen is open sends the person to sign in, with the
// screen to come back to.
test('a session that has ended sends the person to sign in and back', async ({ page, pk }) => {
  await answer(page, `GET /api/popkins/${created.id}/invite`, { status: 401 });

  await pk.open('popkinCreated');

  await expect(page).toHaveURL(
    `/sign-in?returnUrl=${encodeURIComponent(`/p/${created.id}/created`)}`,
  );
});
