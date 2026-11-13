import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { parity } from '../../fixtures/parity';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';
import { PopkinSettingsDialog } from '../../pages/popkin-settings.dialog';

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
  // Popkin settings as journey 9 builds it: the Host's two rows, a member's one.
  {
    key: 'popkinSettings',
    ...wrapUpStates.popkinSettings,
    name: 'settings-host',
    region: (page) => new PopkinSettingsDialog(page).menu,
  },
  {
    key: 'popkinSettingsMember',
    ...wrapUpStates.popkinSettingsMember,
    name: 'settings-member',
    region: (page) => new PopkinSettingsDialog(page).menu,
  },
]);
