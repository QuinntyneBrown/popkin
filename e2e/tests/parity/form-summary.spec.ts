import { parity } from '../../fixtures/parity';
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
]);
