import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperiencesPage } from '../../pages/experiences.page';

// The grid is compared in its own spec; what is the body's own is its skeleton, and the room it
// gives a state that stands in for the grid.
parity('experiences', [
  {
    key: 'experiencesLoading',
    ...experienceStates.experiencesLoading,
    name: 'loading',
    region: (page) => new ExperiencesPage(page).listSkeleton,
  },
  {
    key: 'experiencesEmpty',
    ...experienceStates.experiencesEmpty,
    name: 'empty',
    region: (page) => new ExperiencesPage(page).empty,
  },
  {
    key: 'experiencesError',
    ...experienceStates.experiencesError,
    name: 'error',
    region: (page) => new ExperiencesPage(page).empty,
  },
  {
    key: 'experiencesNoResults',
    ...experienceStates.experiencesNoResults,
    name: 'no-results',
    region: (page) => new ExperiencesPage(page).empty,
  },
]);
