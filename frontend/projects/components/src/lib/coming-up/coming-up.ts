import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';

/** One date in "Coming up". */
export interface ComingUpItem {
  /** Whose it is, read as the face's name. */
  who: StackAvatar;
  /** "Ruth’s birthday". */
  title: string;
  /** "Oct 24". */
  day: string;
}

/**
 * Coming up (docs/design-system/components/group-browser.html, the open group's dates): each of
 * the members' next key dates with their face, what it is and its day (L2-146 AC5). The face is
 * named by its stack; the title and day say the rest.
 */
@Component({
  selector: 'ul[pk-coming-up]',
  imports: [AvatarStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './coming-up.html',
  styleUrl: './coming-up.scss',
  host: { class: 'coming-up' },
})
export class ComingUp {
  readonly dates = input.required<readonly ComingUpItem[]>();
}
