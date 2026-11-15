import { parity } from '../../fixtures/parity';
import { openNewStory, theMockPlan } from '../../fixtures/plan';
import { NewStoryDialog } from '../../pages/new-story.dialog';

parity('who-chips', [
  {
    key: 'newStory',
    name: 'one on it',
    region: (page) => new NewStoryDialog(page).whoField,
    before: theMockPlan,
    app: async (page) => void (await openNewStory(page)),
  },
]);
