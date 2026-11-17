import type { DialogConfig } from '@angular/cdk/dialog';

/**
 * The CDK `DialogConfig` a Popkin dialog opens with: named by its `pk-dialog` title
 * (`dlg-title`), `aria-modal`, and with no CDK backdrop because `pk-dialog` draws its own, as
 * the mocks do. A dialog's own options (its data, a description, another title id, where focus
 * goes and returns) are passed in and win over these. Its types come from the `open` call it is
 * passed to, so `data` is checked against the dialog's own data type.
 */
export function dialogConfig<D = unknown, R = unknown>(
  options: DialogConfig<NoInfer<D>, NoInfer<R>> = {},
): DialogConfig<D, R> {
  return { ariaLabelledBy: 'dlg-title', hasBackdrop: false, ariaModal: true, ...options };
}
