import { parity } from '../../fixtures/parity';
import { ExperienceDetailPage } from '../../pages/experience-detail.page';

parity('experience-detail', [
  // One column on a phone; at 1280 px the lead beside the rest.
  {
    key: 'experienceDetail',
    name: 'whole',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
  { key: 'experienceDetail', name: 'lead', region: (page) => new ExperienceDetailPage(page).lead },
  {
    key: 'experienceDetail',
    name: 'intro',
    region: (page) => new ExperienceDetailPage(page).intro,
  },
  {
    key: 'experienceDetail',
    name: 'cards',
    region: (page) => new ExperienceDetailPage(page).cards,
  },
  // For its sharer and the Host: the actions over the picture, opposite Back.
  {
    key: 'experienceDetailOwn',
    name: 'own-picture',
    region: (page) => new ExperienceDetailPage(page).picture,
  },
  {
    key: 'experienceDetailRated',
    name: 'rated',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
  {
    key: 'experienceDetailLoading',
    name: 'loading',
    region: (page) => new ExperienceDetailPage(page).detail,
  },
]);
