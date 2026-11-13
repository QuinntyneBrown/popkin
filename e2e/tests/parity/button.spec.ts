import { experienceStates } from '../../fixtures/experience-states';
import { ShareExperienceDialog } from '../../pages/share-experience.dialog';
import { theMockHome } from '../../fixtures/home';
import { PopkinHomePage } from '../../pages/popkin-home.page';
import { PopkinCreatedPage } from '../../pages/popkin-created.page';
import { lakesideInvite } from '../../fixtures/journeys';
import { HowLongPage } from '../../pages/how-long.page';
import { howLongForLakeside } from '../../fixtures/journeys';
import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { VerifyCodePage } from '../../pages/verify-code.page';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';
import { hold } from '../../fixtures/stubs';
import { NotFoundPage } from '../../pages/not-found.page';
import { SignUpPage } from '../../pages/sign-up.page';
import { LandingPage } from '../../pages/landing.page';
import { WelcomePage } from '../../pages/welcome.page';

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
  {
    key: 'verifyCode',
    name: 'confirm',
    region: (page) => new VerifyCodePage(page).primaryButton,
    app: codeScreenAt24Seconds,
  },
  {
    key: 'nameYourPopkin',
    name: 'popkin-disabled',
    region: (page) => new NameYourPopkinPage(page).footerButton,
  },
  {
    key: 'nameYourPopkinFilled',
    name: 'popkin',
    region: (page) => new NameYourPopkinPage(page).footerButton,
    app: (page) => new NameYourPopkinPage(page).chooseLakeside(),
  },
  {
    key: 'howLongSubmitting',
    name: 'popkin-busy',
    region: (page) => new HowLongPage(page).footerButton,
    app: async (page) => {
      await hold(page, 'POST /api/popkins');
      await howLongForLakeside(page);
      await new HowLongPage(page).popItUp.click();
    },
  },
  {
    key: 'popkinCreated',
    name: 'popkin-link',
    region: (page) => new PopkinCreatedPage(page).footerButton,
    before: lakesideInvite,
  },
  {
    key: 'popkinHome',
    name: 'popkin-md-link',
    region: (page) => new PopkinHomePage(page).groupCall,
    before: theMockHome,
  },
  {
    key: 'popkinHome',
    name: 'secondary-md-icon',
    region: (page) => new PopkinHomePage(page).inviteRegion,
    before: theMockHome,
  },
  {
    key: 'shareExperienceBusy',
    ...experienceStates.shareExperienceBusy,
    name: 'sharing',
    region: (page) => new ShareExperienceDialog(page).action,
  },
  { key: 'landing', name: 'primary-sm-link', region: (page) => new LandingPage(page).navStart },
  { key: 'landing', name: 'primary-link', region: (page) => new LandingPage(page).heroStart },
  { key: 'landing', name: 'on-accent-link', region: (page) => new LandingPage(page).freeStart },
  {
    key: 'welcome',
    name: 'secondary-block-link',
    region: (page) => new WelcomePage(page).joinWithCode,
  },
]);
