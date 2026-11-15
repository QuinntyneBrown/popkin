import { parity } from '../../fixtures/parity';
import { theMockThisWeek } from '../../fixtures/schedule';
import { ThisWeekPage } from '../../pages/this-week.page';

const shifts = (page: import('@playwright/test').Page) => new ThisWeekPage(page).shifts;

parity('shifts', [
  // Everyone free from 7:30 pm: the tint and its legend (L2-074 AC5).
  { key: 'thisWeek', name: 'everyone', region: shifts, before: theMockThisWeek, snap: true },
  // Someone works in the evening: no tint, a block to midnight (L2-074 AC5).
  { key: 'thisWeekWorking', name: 'working', region: shifts, before: theMockThisWeek, snap: true },
]);
