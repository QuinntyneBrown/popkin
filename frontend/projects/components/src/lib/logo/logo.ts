import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Mark } from '../mark/mark';

/**
 * The logo (docs/design-system/components/logo.html): the mark and the wordmark. On `<a>` it is a
 * link home; on `<span>` it only names the app, as on Your Popkins, which is home.
 */
@Component({
  selector: 'a[pk-logo], span[pk-logo]',
  imports: [Mark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  host: { class: 'logo' },
})
export class Logo {}
