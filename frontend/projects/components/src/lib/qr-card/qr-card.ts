import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextId = 0;

/**
 * QR card (docs/design-system/components/qr-card.html): the invite's QR code, dark on white with
 * a quiet zone in both themes (L2-059 AC4), and the link as text. `modules` is the code's matrix.
 */
@Component({
  selector: 'div[pk-qr-card]',
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

  protected readonly maskId = `qr-bite-${++nextId}`;
  protected readonly count = computed(() => this.modules().length);
  /** The mark sits on a square of about a quarter of the code, over modules error correction restores. */
  protected readonly logo = computed(() => {
    const n = this.count();
    let side = Math.round(n * 0.24);
    if ((n - side) % 2 !== 0) side += 1;
    const at = (n - side) / 2;
    return { at, side };
  });
  protected readonly cells = computed(() => {
    const n = this.count();
    const { at, side } = this.logo();
    const finder = (r: number, c: number) =>
      (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const underLogo = (r: number, c: number) =>
      r >= at && r < at + side && c >= at && c < at + side;
    let path = '';
    this.modules().forEach((row, r) =>
      row.forEach((dark, c) => {
        if (dark && !finder(r, c) && !underLogo(r, c)) path += `M${c + 0.1} ${r + 0.1}h.8v.8h-.8z`;
      }),
    );
    return path;
  });
  protected readonly finders = computed(() => {
    const n = this.count();
    return [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ];
  });
}
