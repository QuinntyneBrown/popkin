import { atTheRecording } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AuditPage } from '../../pages/admin/audit.page';
import { theMockMutedPeople } from '../../fixtures/notifications';
import { NotificationSettingsPage } from '../../pages/notification-settings.page';

parity('select-field', [
  {
    key: 'adminAudit',
    name: 'toolbar',
    region: (page) => new AuditPage(page).adminField,
    before: atTheRecording,
  },
  // The pill at the end of a birthday's row, and the same greyed while it is off (L2-159 AC4).
  {
    key: 'notificationSettingsPeople',
    name: 'row',
    region: (page) => new NotificationSettingsPage(page).birthdayLead('Grace Adeyemi'),
    before: theMockMutedPeople,
  },
  {
    key: 'notificationSettingsPeople',
    name: 'row-disabled',
    region: (page) => new NotificationSettingsPage(page).birthdayLead('Ifeoma Okafor'),
    before: theMockMutedPeople,
  },
]);
