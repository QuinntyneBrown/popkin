import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperiencesPage } from '../../pages/experiences.page';

// A screen inside a Popkin: its header, main and the Popkin navigation, laid out as tabs on a
// phone and a sidebar on a desktop.
parity('app-screen', [
  {
    key: 'experiences',
    ...experienceStates.experiences,
    name: 'tab',
    region: (page) => new ExperiencesPage(page).screen,
  },
]);
