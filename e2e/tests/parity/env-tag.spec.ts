import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminShell } from '../../pages/admin/admin-shell';

// In the bar, below 1024 px.
parity('env-tag', [
  {
    key: 'adminAdmins',
    name: 'bar',
    region: (page) => new AdminShell(page).envTag,
    before: theMockAdmins,
    widths: [360],
  },
]);
