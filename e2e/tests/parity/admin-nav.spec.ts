import { theMockAdmins } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminShell } from '../../pages/admin/admin-shell';

// The sidebar, from 1024 px: the Access group with its current section, and the admin signed in.
parity('admin-nav', [
  {
    key: 'adminAdmins',
    name: 'access',
    region: (page) => new AdminShell(page).accessGroup,
    before: theMockAdmins,
    widths: [1280],
    // The groups above it differ from the mock's until every section is built.
    snap: true,
  },
  {
    key: 'adminAdmins',
    name: 'me',
    region: (page) => new AdminShell(page).me,
    before: theMockAdmins,
    widths: [1280],
  },
]);
