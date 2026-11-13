import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('comments', [
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'heading',
    region: (page) => new ExperienceDetailPage(page).commentsHeading,
  },
  {
    key: 'experienceDetail',
    ...experienceStates.experienceDetail,
    name: 'list',
    region: (page) => new ExperienceDetailPage(page).comments,
  },
]);
