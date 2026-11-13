import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** The Popkin mark (docs/design-system/components/logo.html): a bubble with a bite out of it. */
@Component({
  selector: 'svg[pk-mark]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mark.html',
  styleUrl: './mark.scss',
  host: {
    class: 'mark',
    '[class.mark--sm]': "size() === 'sm'",
    '[class.mark--lg]': "size() === 'lg'",
    viewBox: '0 0 64 64',
    'aria-hidden': 'true',
  },
})
export class Mark {
  readonly size = input<'sm' | 'base' | 'lg'>('base');
  protected readonly maskId = `bite-${++nextId}`;
}
