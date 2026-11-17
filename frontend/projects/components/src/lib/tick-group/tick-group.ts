import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { Link } from '../link/link';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TickList, TickListItem } from '../tick-list/tick-list';

/**
 * Tick group (docs/design-system/components/list-row.html, Import's sections): a Popkin's tile,
 * name and number of people over its tick list, the first `shown` of them, then "Show {n} more",
 * which shows the rest (L2-151 AC1, AC6). The ticks are the consumer's, so a person listed
 * under two Popkins carries one tick.
 */
@Component({
  selector: 'section[pk-tick-group]',
  imports: [Link, PopkinTile, TickList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tick-group.html',
  styleUrl: './tick-group.scss',
  host: { '[attr.aria-labelledby]': 'headingId()' },
})
export class TickGroup {
  readonly headingId = input.required<string>();
  readonly name = input.required<string>();
  readonly emoji = input.required<string>();
  /** The Popkin's colour, as a `data-accent`. */
  readonly accent = input.required<string>();
  /** "13 people". */
  readonly count = input.required<string>();
  readonly items = input.required<readonly TickListItem[]>();
  /** How many show before "Show {n} more". */
  readonly shown = input(4);
  readonly value = model<readonly string[]>([]);
  readonly disabled = input(false);

  private readonly expanded = signal(false);
  protected readonly visible = computed(() =>
    this.expanded() ? this.items() : this.items().slice(0, this.shown()),
  );
  protected readonly hidden = computed(() => this.items().length - this.visible().length);
}
