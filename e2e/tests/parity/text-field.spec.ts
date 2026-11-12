import type { Page } from '@playwright/test';
import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';

const fillMara = (page: Page) => new SignUpPage(page).fill('Mara', '(415) 555-0148');
const submitShortNumber = async (page: Page) => {
  const signUp = new SignUpPage(page);
  await signUp.fill('Mara', '(415) 555-014');
  await signUp.submit();
};

parity('text-field', [
  {
    key: 'signUp',
    name: 'default',
    region: (page) => new SignUpPage(page).nameField,
    app: fillMara,
  },
  {
    key: 'signUp',
    name: 'hint',
    region: (page) => new SignUpPage(page).contactHint,
    app: fillMara,
  },
  {
    key: 'signUpInvalid',
    name: 'invalid',
    region: (page) => new SignUpPage(page).phone,
    app: submitShortNumber,
  },
  {
    key: 'signUpInvalid',
    name: 'error',
    region: (page) => new SignUpPage(page).contactError,
    app: submitShortNumber,
  },
]);
