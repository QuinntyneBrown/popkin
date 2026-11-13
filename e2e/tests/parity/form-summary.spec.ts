import { experienceStates } from '../../fixtures/experience-states';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { accountStates } from '../../fixtures/account-states';
import { parity } from '../../fixtures/parity';
import { AccountPage } from '../../pages/account.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('form-summary', [
  {
    key: 'signUpInvalid',
    name: 'one-problem',
    region: (page) => new SignUpPage(page).summary,
    app: async (page) => {
      const signUp = new SignUpPage(page);
      await signUp.fill('Mara', '(415) 555-014');
      await signUp.submit();
    },
  },
  {
    key: 'shareExperienceInvalid',
    ...experienceStates.shareExperienceInvalid,
    name: 'share-experience',
    region: (page) => new ShareExperienceDialog(page).summary,
  },
  {
    key: 'accountInvalid',
    ...accountStates.accountInvalid,
    name: 'account',
    region: (page) => new AccountPage(page).summary,
  },
]);
