import { atTheRecording } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AuditPage } from '../../pages/admin/audit.page';

parity('page-head', [
  {
    key: 'adminAudit',
    name: 'actions',
    region: (page) => new AuditPage(page).pageHead,
    before: atTheRecording,
  },
]);
