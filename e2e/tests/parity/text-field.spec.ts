import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { SignInPage } from '../../pages/sign-in.page';
import type { Page } from '@playwright/test';
import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { answer, problem } from '../../fixtures/stubs';
import responses from '../../fixtures/api/responses.json';
import { VerifyCodePage } from '../../pages/verify-code.page';
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
  {
    key: 'verifyCode',
    name: 'code',
    region: (page) => new VerifyCodePage(page).codeField,
    app: codeScreenAt24Seconds,
    // The mock's code field has autofocus; the app focuses it on open.
    prepare: (page) => new VerifyCodePage(page).code.focus(),
  },
  {
    key: 'verifyCodeInvalid',
    name: 'code-invalid',
    region: (page) => new VerifyCodePage(page).codeField,
    app: async (page) => {
      const id = responses['POST /api/auth/codes'].body.verificationId;
      await answer(
        page,
        `POST /api/auth/codes/${id}/confirm`,
        problem(400, 'code_mismatch', { attemptsLeft: 4 }),
      );
      await codeScreenAt24Seconds(page);
      const verify = new VerifyCodePage(page);
      await verify.type('111111');
      await verify.codeError.waitFor();
    },
    prepare: (page) => new VerifyCodePage(page).code.focus(),
  },
  {
    key: 'signInInvalid',
    name: 'sign-in-invalid',
    region: (page) => new SignInPage(page).contactField,
    app: async (page) => {
      const signIn = new SignInPage(page);
      await signIn.contact.fill('mara@hey');
      await signIn.send.click();
      await signIn.contactError.waitFor();
    },
  },
  // "(optional)" after the label.
  {
    key: 'shareExperience',
    name: 'optional',
    region: (page) => new ShareExperienceDialog(page).whenField,
  },
  {
    key: 'shareExperience',
    name: 'optional-empty',
    region: (page) => new ShareExperienceDialog(page).placeField,
  },
  {
    key: 'shareExperienceBusy',
    name: 'read-only',
    region: (page) => new ShareExperienceDialog(page).whenField,
  },
  {
    key: 'shareExperienceInvalid',
    name: 'title-invalid',
    region: (page) => new ShareExperienceDialog(page).titleField,
    // The mock's Title has autofocus; the dialog focuses it on open.
    prepare: (page) => new ShareExperienceDialog(page).title.focus(),
  },
]);
