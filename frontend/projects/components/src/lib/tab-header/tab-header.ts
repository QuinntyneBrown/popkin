import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Tab header (docs/design-system/components/top-bar.html, `tab-header`): the head of one of a
 * Popkin's tabs. It names the tab (the screen's `h1`), sums it up in a line with a few faces
 * ("48 photos from 11 people"), and holds the chips that filter the tab. From 768 px the chips
 * sit beside the name and the tab's main action joins them as a button; on a phone that action
 * is the floating one (`pk-fab` in the app screen), so the button here is absent (L2-058 AC9).
 *
 * While `loading` the line is a skeleton; the body of the tab says what is loading.
 *
 * Slot: the default slot holds the filter's `pk-chip`s, each with its `aria-pressed`; they are
 * a group named by `filter`.
 */
@Component({
  selector: 'header[pk-tab-header]',
  imports: [AvatarStack, Button, Icon, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tab-header.html',
  styleUrl: './tab-header.scss',
  host: { class: 'tab-header' },
})
export class TabHeader {
  /** The name of the tab, the screen's `h1`: "Photos". */
  readonly heading = input.required<string>();
  /** The line under the name: "48 photos from 11 people", "No photos yet". */
  readonly summary = input('');
  /** A few of the people the line counts, before its words. */
  readonly avatars = input<readonly StackAvatar[]>([]);
  /** How many people the avatars leave out; 0 shows no "+N". */
  readonly more = input(0);
  /** A skeleton in place of the line. */
  readonly loading = input(false);
  /** The name of the group of chips: "Filter". Without it the header has no chips. */
  readonly filter = input<string>();
  /** The words of the tab's main action, a button from 768 px: "Add photos". None without it. */
  readonly action = input<string>();
  readonly actionIcon = input<IconName>('plus');

  /** The action was chosen. */
  readonly acted = output<void>();
}
