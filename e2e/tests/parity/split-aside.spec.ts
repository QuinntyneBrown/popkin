import { parity } from '../../fixtures/parity';
import { howLongForLakeside, maraWithPhoto, theMockWrappedInvite } from '../../fixtures/journeys';
import { HowLongPage } from '../../pages/how-long.page';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';
import { SignUpPage } from '../../pages/sign-up.page';
import { WrapUpPage } from '../../pages/wrap-up.page';

// The aside is not rendered below 768 px, so there is nothing to compare at 360 px.
parity('split-aside', [
  {
    key: 'signUp',
    name: 'photo',
    region: (page) => new SignUpPage(page).picture,
    widths: [1280],
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'tint-centred',
    region: (page) => new NameYourPopkinPage(page).picture,
    before: maraWithPhoto,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
    widths: [1280],
  },
  {
    key: 'howLongForever',
    name: 'tint-icon',
    region: (page) => new HowLongPage(page).picture,
    app: async (page) => {
      await howLongForLakeside(page);
      await new HowLongPage(page).option('Keep it going').click();
    },
    widths: [1280],
  },
  {
    key: 'joinInviteWrapped',
    name: 'photo-muted',
    region: (page) => new JoinInvitePage(page).picture,
    before: theMockWrappedInvite,
    widths: [1280],
  },
  // The recap that wrapping up will make: a mosaic of its photos over the Popkin.
  { key: 'wrapUp', name: 'recap', region: (page) => new WrapUpPage(page).picture, widths: [1280] },
]);
