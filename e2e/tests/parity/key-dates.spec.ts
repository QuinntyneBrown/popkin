import type { Page } from '@playwright/test';
import { chidiProfile, contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactProfilePage } from '../../pages/contact-profile.page';

const keyDate = (over: object) => ({
  id: '00000000-0000-4000-e000-000000000101',
  kind: 'Birthday',
  title: null,
  month: 1,
  day: 24,
  year: null,
  everyYear: true,
  reminder: 'OneWeekBefore',
  nextOn: '2027-01-24',
  daysLeft: 131,
  ...over,
});

const chidi = async (page: Page) => {
  await page.clock.install({ time: contactsMorning });
  await chidiProfile(page, {
    keyDates: [
      keyDate({}),
      keyDate({
        id: '00000000-0000-4000-e000-000000000102',
        kind: 'Anniversary',
        month: 9,
        day: 26,
        nextOn: '2026-09-26',
        daysLeft: 11,
        reminder: 'ThreeDaysBefore',
      }),
    ],
  });
};

parity('key-dates', [
  // Chidi's birthday, then his anniversary in 11 days.
  {
    key: 'contactProfile',
    name: 'profile',
    region: (page) => new ContactProfilePage(page).keyDateList,
    before: chidi,
    snap: true,
  },
]);
