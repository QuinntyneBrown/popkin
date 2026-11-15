import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Task (docs/design-system/components/task.html): a follow-up or a promise, ticked off in place.
 * The tick is a toggle button (`aria-pressed`) named "Mark done: …" or "Mark not done: …"; done
 * strikes the words through, so the tick and its colour are not the only sign.
 *
 * - `list` (the default) is a row of Follow-ups: who it is for (`who`, a link with their small
 *   avatar), a `note` with its `noteIcon`, and the `due` day at its end, `late` in the accent.
 * - `card` is a tinted row on Today: a `note` (`late` in the accent) and their avatar at its end.
 * - `outline` is a habit that is due: an `icon` in place of the tick, the words a `link`, and an
 *   action at its end.
 *
 * The end of a card or an outline is its content.
 */
@Component({
  selector: 'li[pk-task]',
  imports: [Avatar, Icon, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task.html',
  styleUrl: './task.scss',
  host: {
    class: 'task',
    '[class.task--card]': "variant() === 'card'",
    '[class.task--outline]': "variant() === 'outline'",
  },
})
export class Task {
  readonly text = input.required<string>();
  readonly variant = input<'list' | 'card' | 'outline'>('list');
  /** Ticked off. An outline has no tick. */
  readonly done = model(false);
  /** The words as a link, as an outline's habit is. */
  readonly link = input<string | readonly unknown[]>();
  /** An outline's icon, in place of the tick. */
  readonly icon = input<IconName>();
  /** Who it is for, a link to them, with their avatar. */
  readonly who = input<string>();
  readonly whoLink = input<string | readonly unknown[]>();
  readonly whoPhoto = input<string | null>(null);
  /** The `data-accent` of the person's colour. */
  readonly whoAccent = input<string>();
  /** A line under the words, such as "You promised · Chat on Sep 3". */
  readonly note = input<string>();
  readonly noteIcon = input<IconName>();
  /** The day it is due, at the row's end: "Today", "2 days late". */
  readonly due = input<string>();
  /** Overdue: the due day, or a card's note, in the accent and bold. */
  readonly late = input(false);

  protected readonly checkLabel = computed(
    () => `${this.done() ? 'Mark not done' : 'Mark done'}: ${this.text()}`,
  );
}
