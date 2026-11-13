import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('score-card', [
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'score',
    region: (page) => new ExperienceDetailPage(page).scoreCard,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'bars',
    region: (page) => new ExperienceDetailPage(page).bars,
  },
  // The count is one more once the member has rated.
  {
    key: 'experienceDetailRated',
    ...experienceStates.experienceDetailRated,
    name: 'rated',
    region: (page) => new ExperienceDetailPage(page).scoreCard,
  },
]);
