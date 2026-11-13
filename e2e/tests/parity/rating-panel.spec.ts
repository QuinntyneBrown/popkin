import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('rating-panel', [
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'asks',
    region: (page) => new ExperienceDetailPage(page).ratingPanel,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'stars',
    region: (page) => new ExperienceDetailPage(page).starGroup,
  },
  // Five stars given: all five filled, and "Add a comment" under them.
  {
    key: 'experienceDetailRated',
    ...experienceStates.experienceDetailRated,
    name: 'thanks',
    region: (page) => new ExperienceDetailPage(page).ratingPanel,
  },
]);
