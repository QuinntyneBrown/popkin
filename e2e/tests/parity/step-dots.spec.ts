import { parity } from '../../fixtures/parity';
import { SignUpPage } from '../../pages/sign-up.page';
import { NameYourPopkinPage } from '../../pages/name-your-popkin.page';
import { offerNewPopkin } from '../../fixtures/features';

parity('step-dots', [
  { key: 'signUp', name: 'step-1-of-3', region: (page) => new SignUpPage(page).stepDots },
  {
    key: 'nameYourPopkin',
    name: 'step-2-of-4',
    before: (page) => offerNewPopkin(page, ['Plan', 'Schedules']),
    region: (page) => new NameYourPopkinPage(page).steps,
  },
]);
