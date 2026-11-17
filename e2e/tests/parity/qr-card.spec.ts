import { openTheInvite, theMockHome } from '../../fixtures/home';
import { InviteDialog } from '../../pages/invite.dialog';
import { lakesideInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

// The card's name and link; the QR code itself is compared in qr.spec.ts.
parity('qr-card', [
  {
    key: 'popkinCreated',
    name: 'link',
    region: (page) => new PopkinCreatedPage(page).link,
    before: lakesideInvite,
  },
  {
    key: 'inviteDialog',
    name: 'name',
    region: (page) => new InviteDialog(page).name,
    before: theMockHome,
    app: openTheInvite,
  },
  {
    key: 'inviteDialog',
    name: 'dialog-link',
    region: (page) => new InviteDialog(page).link,
    before: theMockHome,
    app: openTheInvite,
  },
]);
