import { openTheInvite, theMockHome } from '../../fixtures/home';
import { InviteDialog } from '../../pages/invite.dialog';
import { lakesideInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

// The QR code itself differs (the mock draws a version-2 sample, the app encodes the link at
// error correction H), so the card's link is compared and the code is left to the sweep.
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
