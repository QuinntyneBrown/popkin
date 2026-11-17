import { theMockNotificationSettings } from '../../fixtures/notifications';
import { parity } from '../../fixtures/parity';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('undo-bar', [
  // "You’re unsubscribed from all Popkin email." with "Turn email back on" (L2-156 AC3).
  {
    key: 'notificationSettingsUnsubscribed',
    name: 'unsubscribed',
    region: (page) => new NotificationSettingsPage(page).undoBar,
    before: theMockNotificationSettings,
    app: async (page) => {
      await new NotificationSettingsPage(page).emailSwitch.click();
      await page.mouse.move(0, 0);
    },
  },
]);
