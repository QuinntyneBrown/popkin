import { wrapUpStates } from '../../fixtures/wrap-up-states';
import { experienceStates } from '../../fixtures/experience-states';
import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { ExperienceActionsDialog } from '../../pages/experience-actions.dialog';
import { PopkinSettingsDialog } from '../../pages/popkin-settings.dialog';
import { ReactionsDialog } from '../../pages/reactions.dialog';
import { reactStates } from '../../fixtures/react-states';

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
  {
    key: 'account',
    ...accountStates.account,
    name: 'account-sign-out',
    region: (page) => new AccountPage(page).signOutRow,
  },
  // Journey 12: "More reactions", closed and open, and Delete on the member's own message.
  {
    key: 'reactions',
    ...reactStates.reactions,
    name: 'more-reactions',
    region: (page) => new ReactionsDialog(page).moreReactions,
  },
  {
    key: 'reactionsMore',
    ...reactStates.reactionsMore,
    name: 'more-reactions-open',
    region: (page) => new ReactionsDialog(page).moreReactions,
  },
  {
    key: 'reactionsMine',
    ...reactStates.reactionsMine,
    name: 'delete-message',
    region: (page) => new ReactionsDialog(page).deleteRow,
  },
]);
