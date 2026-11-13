import { SignInPage } from '../../pages/sign-in.page';
import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { VerifyCodePage } from '../../pages/verify-code.page';
import { WelcomePage } from '../../pages/welcome.page';

parity('link', [
  {
    key: 'verifyCode',
    name: 'text',
    region: (page) => new VerifyCodePage(page).differentNumberRegion,
    app: codeScreenAt24Seconds,
  },
  {
    key: 'verifyCode',
    name: 'text-disabled',
    region: (page) => new VerifyCodePage(page).resendRegion,
    app: codeScreenAt24Seconds,
  },
  {
    key: 'signIn',
    name: 'with-action',
    region: (page) => new SignInPage(page).startAPopkinRegion,
  },
  // The same link as the whole of its line: the welcome screen.
  { key: 'welcome', name: 'with-action-line', region: (page) => new WelcomePage(page).signIn },
]);
