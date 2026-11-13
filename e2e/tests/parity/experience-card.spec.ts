import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperiencesPage } from '../../pages/experiences.page';

const canoe = 'Sunrise canoe to Heron Point';

parity('experience-card', [
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'rated',
    region: (page) => new ExperiencesPage(page).card(canoe),
  },
  // Sam has no photo: his initials on his colour.
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'initials',
    region: (page) => new ExperiencesPage(page).footOf('La Paloma Taqueria'),
  },
  // One the group wants to do counts who is keen where a rating would be.
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'keen',
    region: (page) => new ExperiencesPage(page).card('Beach day next summer?'),
  },
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'kind',
    region: (page) => new ExperiencesPage(page).kindOf(canoe),
  },
]);
