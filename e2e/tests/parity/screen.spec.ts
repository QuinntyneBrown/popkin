import {
  joelAtTheMockInvite,
  joelWhoseJoinFails,
  joelWhoseJoinHangs,
  theInviteFailing,
  theMockInvite,
  theMockWrappedInvite,
} from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NotFoundPage } from '../../pages/not-found.page';
import { YourProfilePage } from '../../pages/your-profile.page';

parity('screen', [
  { key: 'notFound', region: (page) => new NotFoundPage(page).screen },
  {
    key: 'joinInvite',
    name: 'invite',
    region: (page) => new JoinInvitePage(page).screen,
    before: theMockInvite,
  },
  {
    key: 'joinInviteWrapped',
    name: 'invite-wrapped-up',
    region: (page) => new JoinInvitePage(page).screen,
    before: theMockWrappedInvite,
  },
  {
    key: 'joinInviteError',
    name: 'invite-error',
    region: (page) => new JoinInvitePage(page).screen,
    before: theInviteFailing,
  },
  {
    key: 'yourProfile',
    name: 'profile',
    region: (page) => new YourProfilePage(page).screen,
    before: joelAtTheMockInvite,
  },
  {
    key: 'yourProfileInvalid',
    name: 'profile-no-name',
    region: (page) => new YourProfilePage(page).screen,
    before: joelAtTheMockInvite,
    app: (page) => new YourProfilePage(page).name.fill(''),
  },
  {
    key: 'yourProfileSubmitting',
    name: 'profile-joining',
    region: (page) => new YourProfilePage(page).screen,
    before: joelWhoseJoinHangs,
    app: (page) => new YourProfilePage(page).imIn.click(),
  },
  {
    key: 'yourProfileError',
    name: 'profile-join-failed',
    region: (page) => new YourProfilePage(page).screen,
    before: joelWhoseJoinFails,
    app: (page) => new YourProfilePage(page).imIn.click(),
  },
]);
