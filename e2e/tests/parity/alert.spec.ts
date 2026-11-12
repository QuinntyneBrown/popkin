import { parity } from '../../fixtures/parity';
import { answer, problem } from '../../fixtures/stubs';
import { SignUpPage } from '../../pages/sign-up.page';

parity('alert', [
  {
    key: 'signUpError',
    name: 'danger',
    region: (page) => new SignUpPage(page).alert,
    app: async (page) => {
      await answer(page, 'POST /api/auth/codes', problem(503, 'code_not_sent'));
      const signUp = new SignUpPage(page);
      await signUp.fill('Mara', '(415) 555-0148');
      await signUp.submit();
      await signUp.alert.waitFor();
    },
  },
]);
