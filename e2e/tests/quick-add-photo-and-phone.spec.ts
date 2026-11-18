// Acceptance Test
// Traces to: L2-179
// Description: Quick Add takes a photo, and fills itself from the phone's own contacts where the browser can share them.
import { expect, test } from '../fixtures/pk-test';
import { aPhoneWithContacts } from '../fixtures/phone-contacts';
import { aPhoto } from '../fixtures/photos';
import { QuickAddPage } from '../pages/quick-add.page';

test.describe('Quick Add: a photo and the phone’s contacts', () => {
  // L2-179 AC1
  test('a picked photo shows in place of the camera and is sent with the save', async ({
    page,
    pk,
  }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Femi Bankole');

    const chooser = page.waitForEvent('filechooser');
    await quick.addPhoto.click();
    await (await chooser).setFiles(aPhoto('lake.jpg'));

    await expect(quick.photo).toHaveAttribute('src', /^blob:/);
    const request = page.waitForRequest(
      (r) => r.method() === 'POST' && r.url().endsWith('/api/contacts/people'),
    );
    await quick.save.click();
    expect((await request).postData()).toContain('name="photo"');
  });

  // L2-179 AC2
  test('a contact picked from the phone fills the name and the first number', async ({
    page,
    pk,
  }) => {
    await aPhoneWithContacts(page, [
      { name: ['Femi Bankole'], tel: ['+44 7700 900631', '+44 20 7946 0018'] },
    ]);
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);

    await quick.pickFromPhone.click();

    await expect(quick.name).toHaveValue('Femi Bankole');
    await expect(quick.phone).toHaveValue('+44 7700 900631');
    await expect(quick.save).toBeEnabled();
    expect(await page.evaluate(() => window.pkPhoneContacts.asked)).toEqual([
      { properties: ['name', 'tel'], options: { multiple: false } },
    ]);
  });

  // L2-179 AC3
  test('a browser that cannot share the phone’s contacts is not offered them', async ({
    page,
    pk,
  }) => {
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);

    await expect(quick.name).toBeVisible();
    await expect(quick.pickFromPhone).toHaveCount(0);
  });

  // L2-179 AC4
  test('when none is picked, Quick Add is unchanged', async ({ page, pk }) => {
    await aPhoneWithContacts(page, []);
    await pk.open('quickAdd');
    const quick = new QuickAddPage(page);
    await quick.name.fill('Grace');
    await quick.phone.fill('07700 900123');

    await quick.pickFromPhone.click();

    await expect(quick.name).toHaveValue('Grace');
    await expect(quick.phone).toHaveValue('07700 900123');
  });
});
