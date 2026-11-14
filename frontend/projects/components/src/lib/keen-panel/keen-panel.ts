import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/**
 * Keen panel (docs/design-system/components/rating.html#keen-panel): in the rating panel's place
 * on something the group wants to do, the same tinted card asks "Keen to do this?", shows the
 * first faces of who is keen with "+N" for the rest and the `count` in words, and holds the keen
 * toggle (L2-042 AC1). The stack is hidden from assistive technology; the count says how many.
 *
 * The toggle is a Popkin button with `aria-pressed`, labelled `label` ("I’m keen", "You’re
 * keen"), so the state is said in words as well as drawn (AC2, AC3). The panel keeps nothing: a
 * press is told as `toggled`, and the consumer sets `pressed` from the answer. While `busy` the
 * toggle says it is disabled and a press is ignored, but it keeps the focus, so the keyboard
 * stays on it. `pressed` null offers no toggle, as in a wrapped-up Popkin.
 *
 * Slot: the default slot is beside the toggle, for "We did this" (AC4). Set `data-accent` on an
 * ancestor.
 */
@Component({
  selector: 'div[pk-keen-panel]',
  imports: [AvatarStack, Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './keen-panel.html',
  styleUrl: './keen-panel.scss',
  host: { class: 'card card--tint card--center' },
})
export class KeenPanel {
  readonly heading = input('Keen to do this?');
  /** How many are keen, in words: "7 keen". */
  readonly count = input.required<string>();
  /** The first four who are keen, the earliest first. */
  readonly avatars = input.required<readonly StackAvatar[]>();
  /** How many more are keen than are shown; 0 shows no "+N". */
  readonly more = input(0);
  /** Whether the member is keen; null offers no toggle. */
  readonly pressed = input<boolean | null>(null);
  /** The toggle's words: "I’m keen", or "You’re keen" while pressed. */
  readonly label = input('');
  /** A change is being saved: the toggle cannot be pressed again until it is. */
  readonly busy = input(false);

  /** The member pressed the toggle. */
  readonly toggled = output<void>();

  protected press(): void {
    if (!this.busy()) this.toggled.emit();
  }
}
