import { maraWithPhoto, theMockInvite } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';

parity('avatar', [
  {
    key: 'nameYourPopkinFilled',
    name: 'photo-xs',
    region: (page) => new NameYourPopkinPage(page).previewAvatar,
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
  {
    key: 'joinInvite',
    name: 'initials-sm-ring',
    region: (page) => new JoinInvitePage(page).avatars.last(),
    before: theMockInvite,
  },
]);
