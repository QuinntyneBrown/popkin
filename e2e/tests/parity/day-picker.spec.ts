import { parity } from '../../fixtures/parity';
import { theMockThisWeek, theThisWeekEmpty } from '../../fixtures/schedule';
import { ThisWeekPage } from '../../pages/this-week.page';

const picker = (page: import('@playwright/test').Page) => new ThisWeekPage(page).dayPicker;

parity('day-picker', [
  // Wednesday chosen, everyone free on it (L2-074 AC2).
  { key: 'thisWeek', name: 'everyone', region: picker, before: theMockThisWeek },
  { key: 'thisWeekWorking', name: 'working', region: picker, before: theMockThisWeek },
  { key: 'thisWeekEmpty', name: 'empty', region: picker, before: theThisWeekEmpty },
]);
