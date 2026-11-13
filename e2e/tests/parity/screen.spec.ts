import { wrapUpStates } from '../../fixtures/wrap-up-states';
import {
  joelAtTheMockInvite,
  joelWhoseJoinFails,
  joelWhoseJoinHangs,
  joinFromTheInvite,
  theInviteFailing,
  theMockInvite,
  theMockWrappedInvite,
} from '../../fixtures/journeys';
import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { JoinInvitePage } from '../../pages/join-invite.page';
import { NotFoundPage } from '../../pages/not-found.page';
import { YourProfilePage } from '../../pages/your-profile.page';
import { YoureInPage } from '../../pages/youre-in.page';
import { WrapUpPage } from '../../pages/wrap-up.page';
import { RecapPage } from '../../pages/recap.page';

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
  {
    key: 'youreIn',
    name: 'arrival',
    region: (page) => new YoureInPage(page).screen,
    before: joelAtTheMockInvite,
    app: joinFromTheInvite,
  },
  // Wrap up: the Popkin's tile above the heading, a split screen from 768 px.
  {
    key: 'wrapUp',
    ...wrapUpStates.wrapUp,
    name: 'wrap-up',
    region: (page) => new WrapUpPage(page).main,
  },
  {
    key: 'wrapUpAlbumOff',
    ...wrapUpStates.wrapUpAlbumOff,
    name: 'wrap-up-album-off',
    region: (page) => new WrapUpPage(page).main,
  },
  {
    key: 'wrapUpSubmitting',
    ...wrapUpStates.wrapUpSubmitting,
    name: 'wrap-up-submitting',
    region: (page) => new WrapUpPage(page).main,
  },
  // What went wrong sits between the lead and the facts.
  {
    key: 'wrapUpError',
    ...wrapUpStates.wrapUpError,
    name: 'wrap-up-error',
    region: (page) => new WrapUpPage(page).main,
  },
  // The recap's body: right under the top bar, on the Popkin's wash.
  {
    key: 'recap',
    ...wrapUpStates.recap,
    name: 'recap',
    region: (page) => new RecapPage(page).main,
  },
  {
    key: 'recapError',
    ...wrapUpStates.recapError,
    name: 'recap-error',
    region: (page) => new RecapPage(page).main,
  },
  // One centred column at every width.
  {
    key: 'account',
    ...accountStates.account,
    name: 'account',
    region: (page) => new AccountPage(page).screen,
  },
]);
