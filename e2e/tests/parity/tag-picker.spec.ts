import { parity } from '../../fixtures/parity';
import { openNewStory, theMockPlan } from '../../fixtures/plan';
import { NewStoryDialog } from '../../pages/new-story.dialog';

parity('tag-picker', [
  {
    key: 'newStory',
    name: 'travel',
    region: (page) => new NewStoryDialog(page).tagField,
    before: theMockPlan,
    app: async (page) => void (await openNewStory(page)),
  },
]);
