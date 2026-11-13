import { codeScreenAt24Seconds } from '../../fixtures/journeys';
import { parity } from '../../fixtures/parity';
import { VerifyCodePage } from '../../pages/verify-code.page';

// The region itself draws nothing; it places the toast. Its toast's icon is compared where both
// targets show the same content.
parity('toast-region', [
  {
    key: 'toastSuccess',
    name: 'success',
    region: (page) => new VerifyCodePage(page).toastIcon,
    app: async (page) => {
      await codeScreenAt24Seconds(page);
      await page.clock.runFor(24_000);
      const verify = new VerifyCodePage(page);
      await verify.resend.click();
      await verify.toast.waitFor();
    },
  },
]);
