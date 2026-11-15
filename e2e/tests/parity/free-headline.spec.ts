import { parity } from '../../fixtures/parity';
import { theMockThisWeek, theThisWeekEmpty } from '../../fixtures/schedule';
import { ThisWeekPage } from '../../pages/this-week.page';

const free = (page: import('@playwright/test').Page) => new ThisWeekPage(page).free;

parity('free-headline', [
  // Everyone free from 7:30 pm, with "Plan dinner in chat" (L2-074 AC3, AC10).
  { key: 'thisWeek', name: 'everyone', region: free, before: theMockThisWeek, snap: true },
  // Three of six free, with "Ask in chat anyway" (L2-074 AC4).
  { key: 'thisWeekWorking', name: 'working', region: free, before: theMockThisWeek, snap: true },
  // Nobody has added their hours yet, with "My hours" (L2-074 AC9).
  { key: 'thisWeekEmpty', name: 'empty', region: free, before: theThisWeekEmpty, snap: true },
]);
