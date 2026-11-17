import { theMockPopkinLevels } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('setting-list', [
  // Each Popkin's level: its tile, its name and line, and the level picker (L2-158 AC1).
  {
    key: 'notificationSettingsPopkins',
    name: 'levels',
    region: (page) => new NotificationSettingsPage(page).settingList,
    snap: true,
    before: theMockPopkinLevels,
  },
  // Lakeside Weekend muted: "Muted. Nothing but reminders", its tile dimmed (L2-158 AC3).
  {
    key: 'notificationSettingsMuted',
    name: 'muted',
    region: (page) => new NotificationSettingsPage(page).settingList,
    snap: true,
    before: theMockPopkinLevels,
    app: (page) => new NotificationSettingsPage(page).muteLakeside(),
  },
]);
