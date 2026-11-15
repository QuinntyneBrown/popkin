import { parity } from '../../fixtures/parity';
import { openNewStory, theMockPlan } from '../../fixtures/plan';
import { NewStoryDialog } from '../../pages/new-story.dialog';

parity('points-picker', [
  {
    key: 'newStory',
    name: 'two',
    region: (page) => new NewStoryDialog(page).sizeField,
    before: theMockPlan,
    app: async (page) => void (await openNewStory(page)),
  },
]);
