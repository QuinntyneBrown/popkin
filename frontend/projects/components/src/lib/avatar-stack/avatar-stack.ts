import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';

/** One face of a stack: initials on the person's colour, or their photo. */
export interface StackAvatar {
  initials: string;
  /** The `data-accent` value of the person's colour. */
  accent: string;
  photo: string | null;
}

/**
 * Avatar stack (docs/design-system/components/avatar.html): a few overlapping faces and "+N" for
 * the rest. Decoration: the count in words beside it says how many people there are.
 */
@Component({
  selector: 'span[pk-avatar-stack]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-stack.html',
  styleUrl: './avatar-stack.scss',
  host: {
    class: 'avatar-stack',
    '[class.avatar-stack--sm]': "size() === 'sm'",
    '[class.avatar-stack--xs]': "size() === 'xs'",
    '[class.avatar-stack--2xs]': "size() === '2xs'",
    'aria-hidden': 'true',
  },
})
export class AvatarStack {
  readonly avatars = input.required<readonly StackAvatar[]>();
  /**
   * `xs` is the stack of the home header: 28 px faces and a 24 px "+N". `2xs` is the stack of a
   * tab's header: 24 px faces.
   */
  readonly size = input<'sm' | 'xs' | '2xs'>('sm');
  /** How many people are not shown; 0 shows no "+N". */
  readonly more = input(0);
}
