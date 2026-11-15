import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** One period of a habit: kept, missed, or the one now due. */
export type KeepPeriod = 'kept' | 'missed' | 'due';

/**
 * Keep strip (docs/design-system/components/keep-strip.html, `keep-strip`): a habit's last
 * periods, oldest first: kept is filled green, missed an empty outline (so fill, not colour
 * alone, tells them apart), due a dashed edge. One image whose name says it in words: "Kept 9 of
 * the last 12, the latest one is due"; its cells are not read one by one. `sm` on a card.
 */
@Component({
  selector: 'div[pk-keep-strip]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './keep-strip.html',
  styleUrl: './keep-strip.scss',
  host: {
    class: 'keep-strip',
    role: 'img',
    '[class.keep-strip--sm]': "size() === 'sm'",
    '[attr.aria-label]': 'label()',
  },
})
export class KeepStrip {
  readonly periods = input.required<readonly KeepPeriod[]>();
  readonly size = input<'base' | 'sm'>('base');

  protected readonly label = computed(() => {
    const periods = this.periods();
    const kept = periods.filter((period) => period === 'kept').length;
    const due = periods[periods.length - 1] === 'due' ? ', the latest one is due' : '';
    return `Kept ${kept} of the last ${periods.length}${due}`;
  });
}
