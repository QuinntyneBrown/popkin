import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { VerifyCodePage } from '../../pages/verify-code.page';

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
]);
