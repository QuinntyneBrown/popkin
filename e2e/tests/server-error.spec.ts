import responses from '../fixtures/api/responses.json';
import { expect, test } from '../fixtures/pk-test';
import { answerOnce, problem } from '../fixtures/stubs';
import { PopkinCreatedPage } from '../pages/popkin-created.page';
import { ServerErrorPage } from '../pages/server-error.page';

const created = responses['POST /api/popkins'].body;
const inviteKey = `GET /api/popkins/${created.id}/invite`;

test.describe('an unexpected server error', () => {
  // L2-056 AC6
  test('says it went wrong on Popkin’s side with a reference code, and keeps the address', async ({
    page,
    pk,
  }) => {
    await answerOnce(page, inviteKey, problem(500, 'server_error', { reference: 'PK-7F3A-2C19' }));

    await pk.open('popkinCreated');

    const error = new ServerErrorPage(page);
    await expect(error.root).toBeVisible();
    await expect(error.heading).toHaveText('That one’s on us');
    await expect(error.reference).toHaveText('Reference PK-7F3A-2C19');
    await expect(page).toHaveURL(new RegExp(`/p/${created.id}/created$`));
  });

  test('Try again opens the screen that failed', async ({ page, pk }) => {
    await answerOnce(page, inviteKey, problem(500, 'server_error', { reference: 'PK-7F3A-2C19' }));
    await pk.open('popkinCreated');
    const error = new ServerErrorPage(page);

    await error.tryAgain.click();

    await expect(new PopkinCreatedPage(page).root).toBeVisible();
    await expect(new PopkinCreatedPage(page).heading).toHaveText('Pop! Lakeside Weekend is up.');
  });

  test('opened on its own it has no reference, and Try again goes to My Popkins', async ({
    page,
    pk,
  }) => {
    await pk.open('serverError');
    const error = new ServerErrorPage(page);

    await expect(error.heading).toHaveText('That one’s on us');
    await expect(error.reference).toHaveCount(0);
    await expect(error.tryAgain).toHaveAttribute('href', '/popkins');
    await expect(error.myPopkins).toHaveAttribute('href', '/popkins');
  });
});
