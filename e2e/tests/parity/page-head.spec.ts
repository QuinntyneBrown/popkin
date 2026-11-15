import { atTheRecording } from '../../fixtures/admin';
import { contactsMorning } from '../../fixtures/contacts';
import { parity } from '../../fixtures/parity';
import { ContactsTodayPage } from '../../pages/contacts-today.page';
import { AuditPage } from '../../pages/admin/audit.page';

parity('page-head', [
  {
    key: 'adminAudit',
    name: 'actions',
    region: (page) => new AuditPage(page).pageHead,
    before: atTheRecording,
  },
  // Contacts Today: the greeting and the day, with no action while nobody is kept.
  {
    key: 'contactsTodayEmpty',
    name: 'contacts-today',
    region: (page) => new ContactsTodayPage(page).pageHead,
    before: (page) => page.clock.install({ time: contactsMorning }),
  },
]);
