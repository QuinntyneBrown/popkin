import { theMockAdmins } from '../../fixtures/admin';
import { AddAdminDialog } from '../../pages/admin/admin-dialogs';
import { AdminsPage } from '../../pages/admin/admins.page';
import { howLongForLakeside } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { settingsStates } from '../../fixtures/settings-states';
import { ChangeLengthDialog } from '../../pages/change-length.dialog';
import { HowLongPage } from '../../pages/how-long.page';

parity('choice-card', [
  {
    key: 'howLong',
    name: 'checked',
    region: (page) => new HowLongPage(page).checkedCard,
    app: howLongForLakeside,
  },
  {
    key: 'howLong',
    name: 'unchecked',
    region: (page) => new HowLongPage(page).firstCard,
    app: howLongForLakeside,
  },
  // In a dialog: "Change how long it lasts" (journey 16).
  {
    key: 'changeLength',
    ...settingsStates.changeLength,
    name: 'dialog',
    region: (page) => new ChangeLengthDialog(page).group,
  },
  // Without an icon, the radio first: an admin's role (L2-119 AC2).
  {
    key: 'adminAdd',
    name: 'role',
    region: (page) => new AddAdminDialog(page).roles,
    before: theMockAdmins,
    app: (page) => new AdminsPage(page).addAdmin.click(),
  },
]);
