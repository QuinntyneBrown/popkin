import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminsPage } from '../../pages/admin/admins.page';

// With a foot: what each role can do, and each role in a sentence.
parity('panel', [
  {
    key: 'adminRoles',
    name: 'foot',
    region: (page) => new AdminsPage(page).panel,
    before: theMockAdmins,
  },
]);
