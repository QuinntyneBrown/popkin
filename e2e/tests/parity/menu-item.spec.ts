import { parity } from '../../fixtures/parity';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';

parity('menu-item', [
  {
    key: 'experienceActions',
    name: 'edit',
    region: (page) => new ExperienceActionsDialog(page).edit,
  },
  // The destructive row: its words are coral.
  {
    key: 'experienceActions',
    name: 'danger',
    region: (page) => new ExperienceActionsDialog(page).delete,
  },
]);
