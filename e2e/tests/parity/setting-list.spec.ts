import { theMockMutedPeople, theMockPopkinLevels } from '../../fixtures/notifications';
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
  // Muted people: a face, the name, the Popkins shared, and "Unmute" (L2-160 AC1).
  {
    key: 'notificationSettingsPeople',
    name: 'muted-people',
    region: (page) => new NotificationSettingsPage(page).mutedList,
    before: theMockMutedPeople,
    snap: true,
  },
  // Birthday reminders: a face, the name, the day, the lead and the switch; Ifeoma's off (L2-159 AC1).
  {
    key: 'notificationSettingsPeople',
    name: 'birthdays',
    region: (page) => new NotificationSettingsPage(page).birthdayList,
    before: theMockMutedPeople,
    snap: true,
  },
]);
