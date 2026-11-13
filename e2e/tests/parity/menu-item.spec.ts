import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';

parity('menu-item', [
  {
    key: 'experienceActions',
    ...experienceStates.experienceActions,
    name: 'edit',
    region: (page) => new ExperienceActionsDialog(page).edit,
  },
  // The destructive row: its words are coral.
  {
    key: 'experienceActions',
    ...experienceStates.experienceActions,
    name: 'danger',
    region: (page) => new ExperienceActionsDialog(page).delete,
  },
]);
