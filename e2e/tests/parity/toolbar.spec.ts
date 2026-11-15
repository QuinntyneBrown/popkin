import { atTheRecording } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AuditPage } from '../../pages/admin/audit.page';

parity('toolbar', [
  {
    key: 'adminAudit',
    name: 'filters',
    region: (page) => new AuditPage(page).toolbar,
    before: atTheRecording,
  },
]);
