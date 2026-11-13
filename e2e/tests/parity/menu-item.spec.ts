import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';
import { PopkinSettingsDialog } from '../../pages/popkin-settings.dialog';

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
  // A row with a line under its words.
  {
    key: 'popkinSettings',
    ...wrapUpStates.popkinSettings,
    name: 'hint',
    region: (page) => new PopkinSettingsDialog(page).wrapUp,
  },
  // The destructive row with a line under its words: a member's "Leave this Popkin".
  {
    key: 'popkinSettingsMember',
    ...wrapUpStates.popkinSettingsMember,
    name: 'leave',
    region: (page) => new PopkinSettingsDialog(page).leave,
  },
]);
