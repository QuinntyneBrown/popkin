import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { VerifyCodePage } from '../../pages/verify-code.page';

// The toast mock confirms a shared experience, so only the parts with the same content compare;
// the whole toast is left to the sweep (ADR 0008).
const newCodeSent = async (page: import('@playwright/test').Page) => {
  await codeScreenAt24Seconds(page);
  await page.clock.runFor(24_000);
  const verify = new VerifyCodePage(page);
  await verify.resend.click();
  await verify.toast.waitFor();
};

parity('toast', [
  {
    key: 'toastSuccess',
    name: 'success-icon',
    region: (page) => new VerifyCodePage(page).toastIcon,
    app: newCodeSent,
  },
  {
    key: 'toastSuccess',
    name: 'dismiss',
    region: (page) => new VerifyCodePage(page).toastDismiss,
    app: newCodeSent,
  },
]);
