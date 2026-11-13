import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Badge (docs/design-system/components/badge.html): a small count on a pill, such as the unread
 * messages of a Popkin. Give it a `label` that says what is counted ("3 unread messages"); the
 * digits alone are then hidden from assistive technology. With a `unit` it says what it counts
 * itself ("3 new") and is a little wider.
 */
@Component({
  selector: 'span[pk-badge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    class: 'badge',
    '[class.badge--popkin]': "variant() === 'popkin'",
    '[class.badge--quiet]': "variant() === 'quiet'",
    '[class.badge--words]': '!!unit()',
  },
})
export class Badge {
  readonly count = input.required<number>();
  /** `accent` is the app's "new"; `popkin` takes the Popkin's colour; `quiet` is sand. */
  readonly variant = input<'accent' | 'popkin' | 'quiet'>('accent');
  /** A word after the count that says what is counted, such as `new`: "3 new". */
  readonly unit = input<string>();
  /** The count in words, read in place of the digits. */
  readonly label = input<string>();

  /** A count above 99 reads "99+". */
  protected readonly shown = computed(() => {
    const count = this.count() > 99 ? '99+' : String(this.count());
    return this.unit() ? `${count} ${this.unit()}` : count;
  });
}
