import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('rating-panel', [
  {
    key: 'experienceDetail',
    name: 'asks',
    region: (page) => new ExperienceDetailPage(page).ratingPanel,
  },
  {
    key: 'experienceDetail',
    name: 'stars',
    region: (page) => new ExperienceDetailPage(page).starGroup,
  },
  // Five stars given: all five filled, and "Add a comment" under them.
  {
    key: 'experienceDetailRated',
    name: 'thanks',
    region: (page) => new ExperienceDetailPage(page).ratingPanel,
  },
]);
