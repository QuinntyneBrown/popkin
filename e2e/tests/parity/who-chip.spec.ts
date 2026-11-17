import { parity } from '../../fixtures/parity';
import { openNewStory, theMockPlan } from '../../fixtures/plan';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { NewStoryDialog } from '../../pages/new-story.dialog';
import { todayAsDrawn } from './today-steps';

const newStory = {
  key: 'newStory',
  before: theMockPlan,
  app: async (page: import('@playwright/test').Page) => void (await openNewStory(page)),
} as const;

parity('who-chip', [
  // Ellie is on the story: the chip is pressed, outlined.
  { ...newStory, name: 'pressed', region: (page) => new NewStoryDialog(page).member('Ellie') },
  { ...newStory, name: 'plain', region: (page) => new NewStoryDialog(page).member('Mara') },
  // As a link, in the default colour: "It's been a while" on Today.
  {
    key: 'contactsToday',
    name: 'link',
    region: (page) => new ContactsTodayPage(page).driftChip('Sam · 59 days'),
    before: todayAsDrawn,
  },
]);
