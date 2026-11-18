import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';

/**
 * Avatar with a tick (docs/design-system/components/avatar.html, `avatar-tick`): a contact just
 * added, the 2xl photo or initials with a tick at its foot (Added, L2-180 AC1). The tick sits
 * outside the avatar's round clip. Decoration: the heading beside it says what happened. Set
 * `data-accent` on it or an ancestor.
 */
@Component({
  selector: 'span[pk-avatar-tick]',
  imports: [Avatar, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-tick.html',
  styleUrl: './avatar-tick.scss',
  host: { class: 'avatar-tick', 'aria-hidden': 'true' },
})
export class AvatarTick {
  readonly initials = input('');
  readonly photo = input<string | null>(null);
}
