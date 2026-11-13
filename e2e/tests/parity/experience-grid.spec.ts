import { parity } from '../../fixtures/parity';
import { ExperiencesPage } from '../../pages/experiences.page';

// One card across on a phone, four at 1280 px, each as tall as its row.
parity('experience-grid', [
  { key: 'experiences', name: 'four', region: (page) => new ExperiencesPage(page).grid },
  { key: 'experiencesDid', name: 'three', region: (page) => new ExperiencesPage(page).grid },
]);
