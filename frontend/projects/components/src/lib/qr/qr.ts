import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

let nextId = 0;

/**
 * A QR code (docs/design-system/components/qr-card.html, `qr`): dark on white with a quiet zone
 * in both themes, so it scans (L2-059 AC4), with the mark in the middle. `modules` is the code's
 * matrix. It is an image named after the link it holds.
 */
@Component({
  selector: 'svg[pk-qr]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './qr.html',
  styleUrl: './qr.scss',
  host: {
    class: 'qr',
    '[class.qr--sm]': "size() === 'sm'",
    '[class.qr--lg]': "size() === 'lg'",
    role: 'img',
    '[attr.viewBox]': "'0 0 ' + count() + ' ' + count()",
    '[attr.aria-label]': "'QR code for ' + link()",
  },
})
export class Qr {
  readonly modules = input.required<boolean[][]>();
  /** The link as people read it, such as `popk.in/lakeside`. */
  readonly link = input.required<string>();
  /** `sm` is the code of a picture (the landing page's preview); `lg` grows from 768 px. */
  readonly size = input<'sm' | 'base' | 'lg'>('base');

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
