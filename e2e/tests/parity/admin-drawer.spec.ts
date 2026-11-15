import type { Page } from '@playwright/test';
import { atTheRecording } from '../../fixtures/admin';
import { parity } from '../../fixtures/parity';
import { AdminShell } from '../../pages/admin/admin-shell';
import { AdminMenuDialog } from '../../pages/admin/menu.dialog';

// The drawer lists only the sections built so far, so its top is compared: "Close menu", the
// brand and the environment, above the first group.
const top = (page: Page) => new AdminMenuDialog(page).head.locator('.admin-nav__head');

parity('admin-drawer', [
  {
    key: 'adminMenu',
    name: 'menu',
    region: top,
    before: atTheRecording,
    app: (page) => new AdminShell(page).openMenu.click(),
    widths: [360],
  },
]);
