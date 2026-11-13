import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';

/**
 * Direct message intro (docs/design-system/components/message.html, `dm-intro`): the start of a
 * direct message, at the top of its thread: the other member's avatar and name, and the line
 * that says the thread is private, "Only you two can see this" (L2-023 AC1). Set `data-accent`
 * through the avatar's `accent`.
 */
@Component({
  selector: 'div[pk-dm-intro]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dm-intro.html',
  styleUrl: './dm-intro.scss',
  host: { class: 'dm-intro' },
})
export class DmIntro {
  /** The other member's name: "Walt Brennan". */
  readonly name = input.required<string>();
  readonly avatar = input.required<PersonAvatar>();
  /** The line under the name. */
  readonly text = input('Only you two can see this');
}
