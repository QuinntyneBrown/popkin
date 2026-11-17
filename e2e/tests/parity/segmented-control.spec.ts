import { signedInAs, theMockAdmins, theMockFeatures } from '../../fixtures/admin';
import { FeaturesPage } from '../../pages/admin/features.page';
import { AdminsPage } from '../../pages/admin/admins.page';
import { accountStates } from '../../fixtures/account-states';
import { theMockPopkinLevels } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';
import { AccountPage } from '../../pages/account.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('segmented-control', [
  { key: 'signUp', name: 'phone', region: (page) => new SignUpPage(page).segmented },
  {
    key: 'signUpEmail',
    name: 'email',
    region: (page) => new SignUpPage(page).segmented,
    app: (page) => new SignUpPage(page).emailTab.click(),
  },
  // The radio form: the theme of the account (L2-048 AC4).
  {
    key: 'account',
    ...accountStates.account,
    name: 'theme',
    region: (page) => new AccountPage(page).segmented,
  },
  // Tabs with a count: Admins & roles.
  {
    key: 'adminAdmins',
    name: 'count',
    region: (page) => new AdminsPage(page).tabs,
    before: theMockAdmins,
  },
  // The stretched radio form, and the same switched off with a reason (L2-076 AC12).
  {
    key: 'adminFeatures',
    name: 'stretch',
    region: (page) => new FeaturesPage(page).schedules.modes,
    before: async (page) => void (await theMockFeatures(page)),
  },
  {
    key: 'adminFeaturesSupport',
    name: 'disabled-reason',
    region: (page) => new FeaturesPage(page).schedules.modes,
    before: async (page) => {
      await theMockFeatures(page);
      await signedInAs(page, 'Support');
    },
  },
  // A Popkin's level: the choice raised on the surface (L2-158 AC1).
  {
    key: 'notificationSettingsPopkins',
    name: 'levels',
    region: (page) => new NotificationSettingsPage(page).firstLevels,
    snap: true,
    before: theMockPopkinLevels,
  },
]);
