import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';

parity('menu-list', [
  // The sharer's: Edit and Delete.
  {
    key: 'experienceActions',
    ...experienceStates.experienceActions,
    name: 'sharer',
    region: (page) => new ExperienceActionsDialog(page).menu,
  },
  // The Host's, on an experience somebody else shared: Delete alone.
  {
    key: 'experienceActionsHost',
    ...experienceStates.experienceActionsHost,
    name: 'host',
    region: (page) => new ExperienceActionsDialog(page).menu,
  },
]);
