import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminShell } from '../../pages/admin/admin-shell';

// The bar below 1024 px; the sidebar lists only the sections built so far, so it is compared
// a group at a time in admin-nav.
parity('admin-shell', [
  {
    key: 'adminAdmins',
    name: 'bar',
    region: (page) => new AdminShell(page).bar,
    before: theMockAdmins,
    widths: [360],
  },
]);
