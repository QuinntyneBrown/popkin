import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperiencesPage } from '../../pages/experiences.page';

// One card across on a phone, four at 1280 px, each as tall as its row.
parity('experience-grid', [
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'four',
    region: (page) => new ExperiencesPage(page).grid,
  },
  {
    key: 'experiencesDid',
    ...experienceStates.experiencesDid,
    name: 'three',
    region: (page) => new ExperiencesPage(page).grid,
  },
]);
