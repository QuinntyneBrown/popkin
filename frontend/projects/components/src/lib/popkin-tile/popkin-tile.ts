import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Popkin tile (docs/design-system/components/popkin-tile.html): a Popkin's emoji on a tint of its
 * colour, edged in it. Set `data-accent` on it or an ancestor. Decoration: the name beside it
 * names the Popkin.
 */
@Component({
  selector: 'span[pk-popkin-tile]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-tile.html',
  styleUrl: './popkin-tile.scss',
  host: {
    class: 'popkin-tile',
    '[class.popkin-tile--xs]': "size() === 'xs'",
    '[class.popkin-tile--sm]': "size() === 'sm'",
    '[class.popkin-tile--md]': "size() === 'md'",
    '[class.popkin-tile--lg]': "size() === 'lg'",
    '[class.popkin-tile--xl]': "size() === 'xl'",
    '[class.popkin-tile--2xl]': "size() === '2xl'",
    'aria-hidden': 'true',
  },
})
export class PopkinTile {
  readonly emoji = input.required<string>();
  readonly size = input<'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl'>('base');
}
