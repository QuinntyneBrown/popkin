import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Mark } from '../mark/mark';

/** The logo (docs/design-system/components/logo.html): the mark and the wordmark, as a link. */
@Component({
  selector: 'a[pk-logo]',
  imports: [Mark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './logo.html',
  styleUrl: './logo.scss',
  host: { class: 'logo' },
})
export class Logo {}
