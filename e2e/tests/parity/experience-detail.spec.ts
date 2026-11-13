import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('experience-detail', [
  // One column on a phone; at 1280 px the lead beside the rest.
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'whole',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'lead',
    region: (page) => new ExperienceDetailPage(page).lead,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'intro',
    region: (page) => new ExperienceDetailPage(page).intro,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'cards',
    region: (page) => new ExperienceDetailPage(page).cards,
  },
  // For its sharer and the Host: the actions over the picture, opposite Back.
  {
    key: 'experienceDetailOwn',
    ...experienceStates.experienceDetailOwn,
    name: 'own-picture',
    region: (page) => new ExperienceDetailPage(page).picture,
  },
  {
    key: 'experienceDetailRated',
    ...experienceStates.experienceDetailRated,
    name: 'rated',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
  {
    key: 'experienceDetailLoading',
    ...experienceStates.experienceDetailLoading,
    name: 'loading',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
  // A wrapped-up Popkin: the score alone, with no panel to rate it beside it.
  {
    key: 'experienceDetailWrapped',
    ...wrapUpStates.experienceDetailWrapped,
    name: 'wrapped-cards',
    region: (page) => new ExperienceDetailPage(page).cards,
  },
]);
