import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminsPage } from '../../pages/admin/admins.page';

// People, roles chosen in place and an action per row: Admins & roles (L2-119 AC1).
parity('data-table', [
  {
    key: 'adminAdmins',
    name: 'admins',
    region: (page) => new AdminsPage(page).tableWrap,
    before: theMockAdmins,
  },
]);
