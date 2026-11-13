import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('score-card', [
  {
    key: 'experienceDetail',
    name: 'score',
    region: (page) => new ExperienceDetailPage(page).scoreCard,
  },
  { key: 'experienceDetail', name: 'bars', region: (page) => new ExperienceDetailPage(page).bars },
  // The count is one more once the member has rated.
  {
    key: 'experienceDetailRated',
    name: 'rated',
    region: (page) => new ExperienceDetailPage(page).scoreCard,
  },
]);
