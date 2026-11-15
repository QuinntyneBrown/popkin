import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { theMockTimeOff } from '../../fixtures/schedule';
import { AddTimeOffDialog } from '../../pages/add-time-off.dialog';
import { TimeOffPage } from '../../pages/time-off.page';

const row = (page: Page) => new AddTimeOffDialog(page).rows.first();
const openTheDialog = (page: Page) => new TimeOffPage(page).addMyTimeOff.click();

parity('leave-row', [
  // Mara's Monday of the event's week: Off.
  { key: 'addTimeOff', name: 'off', region: row, before: theMockTimeOff, app: openTheDialog },
  // A week more than a year ahead: Working, and every choice disabled (L2-073 AC5).
  {
    key: 'addTimeOffInvalid',
    name: 'disabled',
    region: row,
    before: theMockTimeOff,
    app: openTheDialog,
  },
]);
