import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Qr } from '../qr/qr';

/**
 * QR card (docs/design-system/components/qr-card.html): the invite's QR code (pk-qr), dark on
 * white with a quiet zone in both themes (L2-059 AC4), and the link as text. `modules` is the
 * code's matrix.
 */
@Component({
  selector: 'div[pk-qr-card]',
  imports: [Qr],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr-card.html',
  styleUrl: './qr-card.scss',
  host: { class: 'qr-card', '[class.qr-card--lg]': "size() === 'lg'" },
})
export class QrCard {
  readonly modules = input.required<boolean[][]>();
  /** The link as people read it, such as `popk.in/lakeside`. */
  readonly link = input.required<string>();
  readonly name = input<string>();
  readonly emoji = input<string>();
  /** `lg` is the card as the picture of a split screen, from 768 px. */
  readonly size = input<'base' | 'lg'>('base');
}
