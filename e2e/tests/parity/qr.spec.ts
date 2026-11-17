import { openTheInvite, theMockHome } from '../../fixtures/home';
import { lakesideInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { InviteDialog } from '../../pages/invite.dialog';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';

// The mocks draw the code of https://popk.in/lakeside at error correction H, as the app encodes
// it, so the code itself is compared.
parity('qr', [
  {
    key: 'inviteDialog',
    name: 'invite',
    region: (page) => new InviteDialog(page).qr,
    before: theMockHome,
    app: openTheInvite,
  },
  {
    key: 'popkinCreated',
    name: 'created',
    region: (page) => new PopkinCreatedPage(page).bodyQr,
    before: lakesideInvite,
    // From 768 px the code moves to the screen's picture.
    widths: [360],
  },
  {
    key: 'popkinCreated',
    name: 'created-picture',
    region: (page) => new PopkinCreatedPage(page).pictureQr,
    before: lakesideInvite,
    widths: [1280],
  },
]);
