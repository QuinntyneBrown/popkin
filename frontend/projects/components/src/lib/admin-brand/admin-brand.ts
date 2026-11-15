import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Mark } from '../mark/mark';
import { Wordmark } from '../wordmark/wordmark';

/**
 * Admin brand (docs/design-system/components/admin-shell.html): the mark, the wordmark and the
 * "Admin" tag that says this is the console, not the Popkin app. On `<a>` it leads to the
 * console's start; on `<span>` it only names it, as on sign-in. `lg` draws the larger mark.
 */
@Component({
  selector: 'a[pk-admin-brand], span[pk-admin-brand]',
  imports: [Mark, Wordmark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-brand.html',
  styleUrl: './admin-brand.scss',
  host: { class: 'admin-brand', '[class.admin-brand--lg]': "size() === 'lg'" },
})
export class AdminBrand {
  readonly size = input<'base' | 'lg'>('base');
}
