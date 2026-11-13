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
  host: { class: 'avatar-stack avatar-stack--sm', 'aria-hidden': 'true' },
})
export class AvatarStack {
  readonly avatars = input.required<readonly StackAvatar[]>();
  /** How many people are not shown; 0 shows no "+N". */
  readonly more = input(0);
}
