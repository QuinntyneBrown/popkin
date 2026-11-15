import { atTheRecording } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AuditPage } from '../../pages/admin/audit.page';

parity('select-field', [
  {
    key: 'adminAudit',
    name: 'toolbar',
    region: (page) => new AuditPage(page).adminField,
    before: atTheRecording,
  },
]);
