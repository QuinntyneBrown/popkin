import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminsPage } from '../../pages/admin/admins.page';

parity('permission-table', [
  {
    key: 'adminRoles',
    name: 'roles',
    region: (page) => new AdminsPage(page).tableWrap,
    before: theMockAdmins,
  },
]);
