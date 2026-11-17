import { NotificationSettingsPage } from '../../pages/notification-settings.page';
import { theMockMutedPeople } from '../../fixtures/notifications';
import { mockMatches, searchingFeaturePopkins, theMockFeatures } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { problem } from '../../fixtures/stubs';
import { AddFeaturePopkinDialog, FeaturesPage } from '../../pages/admin/features.page';

const list = (page: Parameters<typeof searchingFeaturePopkins>[0]) =>
  new AddFeaturePopkinDialog(page, 'Schedules').list;

parity('pick-list', [
  // The live Popkins the search "a" finds, the first picked; the add failed (L2-076 AC6, AC8).
  {
    key: 'adminFeatureAddPopkinFailed',
    name: 'picked',
    region: list,
    before: async (page) => {
      await theMockFeatures(page);
      await searchingFeaturePopkins(page);
      await page.route('**/api/admin/features/Schedules/popkins', (route) => {
        const failed = problem(500, 'server_error');
        return route.fulfill({ status: failed.status, json: failed.body });
      });
    },
    app: async (page) => {
      const dialog = new AddFeaturePopkinDialog(page, 'Schedules');
      await new FeaturesPage(page).schedules.addPopkin.click();
      await dialog.search.fill('a');
      await dialog.option(mockMatches[0].name).click();
      await dialog.add.click();
      await dialog.alert.waitFor();
    },
  },
  // A Popkin that already has the feature is a note, not an option.
  {
    key: 'adminFeatureAddPopkinResults',
    name: 'already-on',
    region: list,
    before: async (page) => {
      await theMockFeatures(page);
      await searchingFeaturePopkins(page, [
        {
          popkinId: 'mock-lakeside',
          name: 'Lakeside Weekend',
          emoji: '🏕️',
          colour: 'Teal',
          inviteCode: 'LAKE-0148',
          alreadyOn: true,
        },
      ]);
    },
    app: async (page) => {
      const dialog = new AddFeaturePopkinDialog(page, 'Schedules');
      await new FeaturesPage(page).schedules.addPopkin.click();
      await dialog.search.fill('lake');
      await dialog.notes.waitFor();
    },
  },
  {
    key: 'adminFeatureAddPopkinNoResults',
    name: 'no-results',
    region: list,
    before: async (page) => {
      await theMockFeatures(page);
      await searchingFeaturePopkins(page, []);
    },
    app: async (page) => {
      const dialog = new AddFeaturePopkinDialog(page, 'Schedules');
      await new FeaturesPage(page).schedules.addPopkin.click();
      await dialog.search.fill('zzz');
      await dialog.notes.waitFor();
    },
  },
  // People who share a Popkin: a face, the name and the Popkins (L2-160 AC2).
  {
    key: 'notificationSettingsMuteSearch',
    name: 'people',
    region: (page) => new NotificationSettingsPage(page).pickList,
    before: theMockMutedPeople,
    app: (page) => new NotificationSettingsPage(page).openPicker(),
    snap: true,
  },
]);
