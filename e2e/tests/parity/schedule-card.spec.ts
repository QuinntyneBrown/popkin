import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { theHomeWithNoEveningFree, theMockThisWeek } from '../../fixtures/schedule';
import { PopkinHomePage } from '../../pages/popkin-home.page';

const card = (page: Page) => new PopkinHomePage(page).scheduleCard;

parity('schedule-card', [
  // The next evening everyone is free (L2-075 AC2).
  { key: 'popkinHomeSchedule', name: 'free', region: card, before: theMockThisWeek },
  // No evening this week is free for everyone (L2-075 AC2).
  { key: 'popkinHomeScheduleNone', name: 'none', region: card, before: theHomeWithNoEveningFree },
]);
