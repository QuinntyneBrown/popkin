import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Where toasts stack, above the tabs; a polite live region (L2-056 AC7). */
@Component({
  selector: 'div[pk-toast-region]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.scss',
  host: { class: 'toast-region', role: 'status', 'aria-live': 'polite' },
})
export class ToastRegion {}
