import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('comment', [
  {
    key: 'experienceDetail',
    name: 'first',
    region: (page) => new ExperienceDetailPage(page).firstComment,
  },
  // A hairline divides it from the comment before.
  {
    key: 'experienceDetail',
    name: 'divided',
    region: (page) => new ExperienceDetailPage(page).commentBy('Dev'),
  },
]);
