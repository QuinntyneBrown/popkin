import { parity } from '../../fixtures/parity';
import { hold } from '../../fixtures/stubs';
import { NotFoundPage } from '../../pages/not-found.page';
import { SignUpPage } from '../../pages/sign-up.page';

parity('button', [
  { key: 'notFound', name: 'primary-md', region: (page) => new NotFoundPage(page).primaryButton },
  {
    key: 'notFound',
    name: 'secondary-md',
    region: (page) => new NotFoundPage(page).secondaryButton,
  },
  {
    key: 'signUp',
    name: 'primary-block',
    region: (page) => new SignUpPage(page).primaryButton,
  },
  {
    key: 'signUpSubmitting',
    name: 'busy',
    region: (page) => new SignUpPage(page).primaryButton,
    app: async (page) => {
      await hold(page, 'POST /api/auth/codes');
      const signUp = new SignUpPage(page);
      await signUp.fill('Mara', '(415) 555-0148');
      await signUp.submit();
    },
  },
]);
