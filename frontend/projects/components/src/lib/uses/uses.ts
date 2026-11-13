import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Ideas (docs/design-system/components/uses.html): the grid of idea cards (`article[pk-use]`,
 * projected). One column on a phone, two from 576 px, four from 992 px (L2-001 AC5, AC6).
 */
@Component({
  selector: 'div[pk-uses]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './uses.html',
  styleUrl: './uses.scss',
  host: { class: 'uses' },
})
export class Uses {}
