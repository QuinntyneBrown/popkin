import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { parity } from '../../fixtures/parity';
import { RecapPage } from '../../pages/recap.page';

// One column to 1024 px; at 1280 px the collage and the headline are beside the rest.
parity('recap', [
  {
    key: 'recap',
    ...wrapUpStates.recap,
    name: 'member',
    region: (page) => new RecapPage(page).recap,
  },
  {
    key: 'recapHost',
    ...wrapUpStates.recapHost,
    name: 'host',
    region: (page) => new RecapPage(page).recap,
  },
  // Nothing was rated and no photo was shared: no moment, no album to save.
  {
    key: 'recapPlain',
    ...wrapUpStates.recapPlain,
    name: 'plain',
    region: (page) => new RecapPage(page).recap,
  },
  // With Plan on, "The plan" counts the stories done (L2-075 AC4).
  {
    key: 'recapPlan',
    ...wrapUpStates.recapPlan,
    name: 'plan',
    region: (page) => new RecapPage(page).plan,
  },
  // The album is being prepared: the first action is busy, over the count.
  {
    key: 'recapExporting',
    ...wrapUpStates.recapExporting,
    name: 'exporting',
    region: (page) => new RecapPage(page).actions,
  },
  {
    key: 'recap',
    ...wrapUpStates.recap,
    name: 'people',
    region: (page) => new RecapPage(page).people,
  },
  { key: 'recap', ...wrapUpStates.recap, name: 'card', region: (page) => new RecapPage(page).card },
  {
    key: 'recapLoading',
    ...wrapUpStates.recapLoading,
    name: 'loading',
    region: (page) => new RecapPage(page).skeletons,
  },
]);
