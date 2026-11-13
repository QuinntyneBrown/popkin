import { openTheScanner, withACamera } from '../../fixtures/my-popkins';
import { ScanToJoinDialog } from '../../pages/scan-to-join.dialog';
import { copyTheInvite, openTheInvite, theMockHome } from '../../fixtures/home';
import { InviteDialog } from '../../pages/invite.dialog';
import type { Page } from '@playwright/test';
import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { EndDateDialog } from '../../pages/end-date.dialog';
import { HowLongPage } from '../../pages/how-long.page';

const openEndDate = async (page: Page, today?: Date) => {
  await howLongForLakeside(page, today);
  const step = new HowLongPage(page);
  await step.option('Until a date').click();
  await step.endDate.click();
  await new EndDateDialog(page).panel.waitFor();
};

parity('dialog', [
  {
    key: 'endDate',
    name: 'sheet',
    region: (page) => new EndDateDialog(page).panel,
    app: openEndDate,
    // The mock's Day field has autofocus; the dialog focuses it on open.
    prepare: (page) => new EndDateDialog(page).day.focus(),
  },
  {
    key: 'endDateInvalid',
    name: 'invalid',
    region: (page) => new EndDateDialog(page).panel,
    app: async (page) => {
      // The invalid mock refuses 9 am on 12 November, less than an hour ahead.
      await openEndDate(page, new Date(2026, 10, 12, 8, 30));
      const dialog = new EndDateDialog(page);
      await dialog.day.fill('2026-11-12');
      await dialog.time.fill('09:00');
      await dialog.setTheEnd.click();
      await dialog.error.waitFor();
    },
    prepare: (page) => new EndDateDialog(page).day.focus(),
  },
  {
    key: 'inviteDialog',
    name: 'invite-header',
    region: (page) => new InviteDialog(page).header,
    before: theMockHome,
    app: openTheInvite,
  },
  {
    key: 'inviteDialogCopied',
    name: 'invite-copied',
    region: (page) => new InviteDialog(page).footer,
    before: theMockHome,
    app: copyTheInvite,
  },
  {
    key: 'scanToJoin',
    name: 'scan-header',
    region: (page) => new ScanToJoinDialog(page).header,
    before: withACamera('asking'),
    app: openTheScanner,
  },
  {
    key: 'scanToJoinDenied',
    name: 'scan-denied-footer',
    region: (page) => new ScanToJoinDialog(page).footer,
    before: withACamera('denied'),
    app: openTheScanner,
    // The mock's first action has autofocus; the app moves the focus to it.
    prepare: async (page) => {
      // A key first, so the browser draws the ring it draws for the keyboard, as the mock has.
      await page.keyboard.press('Shift');
      await new ScanToJoinDialog(page).typeTheCode.focus();
    },
  },
]);
