import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';

/**
 * The row of one direct message in a list of threads
 * (docs/design-system/components/list-row.html, `row row--pad`): the other member's avatar and
 * name, the time of the latest message and a line of it. When `unread`, the name is bold, the
 * line stands out and a dot named "Unread" says so (L2-022 AC3). `current` marks the thread that
 * is open beside the list (`aria-current="page"`). Set `routerLink` on it.
 */
@Component({
  selector: 'a[pk-conversation-row]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversation-row.html',
  styleUrl: './conversation-row.scss',
  host: {
    class: 'row row--pad',
    '[attr.aria-current]': "current() ? 'page' : null",
  },
})
export class ConversationRow {
  /** The other member's name: "Walt Brennan". */
  readonly name = input.required<string>();
  readonly avatar = input.required<PersonAvatar>();
  /** When the latest message was sent, in words: "9:41", "Fri". */
  readonly time = input('');
  /** A line of the latest message, with "You: " before the member's own. */
  readonly latest = input('');
  /** It has messages not yet read. */
  readonly unread = input(false);
  readonly current = input(false);
}
