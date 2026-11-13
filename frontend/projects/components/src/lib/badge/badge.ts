import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Badge (docs/design-system/components/badge.html): a small count on a pill, such as the unread
 * messages of a Popkin. Give it a `label` that says what is counted ("3 unread messages"); the
 * digits alone are then hidden from assistive technology.
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
  },
})
export class Badge {
  readonly count = input.required<number>();
  /** `accent` is the app's "new"; `popkin` takes the Popkin's colour; `quiet` is sand. */
  readonly variant = input<'accent' | 'popkin' | 'quiet'>('accent');
  /** The count in words, read in place of the digits. */
  readonly label = input<string>();

  /** A count above 99 reads "99+". */
  protected readonly shown = computed(() => (this.count() > 99 ? '99+' : String(this.count())));
}
