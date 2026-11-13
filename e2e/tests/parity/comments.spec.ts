import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('comments', [
  {
    key: 'experienceDetail',
    name: 'heading',
    region: (page) => new ExperienceDetailPage(page).commentsHeading,
  },
  {
    key: 'experienceDetail',
    name: 'list',
    region: (page) => new ExperienceDetailPage(page).comments,
  },
]);
