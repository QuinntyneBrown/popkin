import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TimeLeft } from '../time-left/time-left';

/** The four places of a Popkin. */
export type PopkinNavTab = 'home' | 'chat' | 'photos' | 'experiences';

interface Tab {
  key: PopkinNavTab;
  label: string;
  icon: IconName;
  /** The route after `/p/{id}`. */
  path: string;
}

const TABS: readonly Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', path: '' },
  { key: 'chat', label: 'Chat', icon: 'message', path: '/chat' },
  { key: 'photos', label: 'Photos', icon: 'photos', path: '/photos' },
  { key: 'experiences', label: 'Experiences', icon: 'experiences', path: '/experiences' },
];

/**
 * Popkin tabs (docs/design-system/components/popkin-nav.html): Home, Chat, Photos and
 * Experiences. Along the bottom on a phone; from 768 px a rail at the side of the screen, and
 * from 1024 px a sidebar that also names the Popkin and leads back to Your Popkins (L2-058 AC8).
 * `wide` is the navigation of a screen deeper than a tab, such as a thread: absent on a phone,
 * where the top bar has Back, and the same rail and sidebar from 768 px. It is a child of the
 * app screen, which makes room for it and gives it its width (`--pk-nav-width`).
 */
@Component({
  selector: 'nav[pk-popkin-nav]',
  imports: [Badge, Icon, PopkinTile, RouterLink, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-nav.html',
  styleUrl: './popkin-nav.scss',
  host: {
    class: 'popkin-nav',
    '[class.popkin-nav--wide]': 'wide()',
    'aria-label': 'Popkin',
  },
})
export class PopkinNav {
  readonly popkinId = input.required<string>();
  readonly name = input.required<string>();
  readonly emoji = input.required<string>();
  /** The line under the name in the sidebar: "14 members". */
  readonly members = input('');
  /** The time the Popkin has left, in words; none when null. */
  readonly timeLeft = input<string | null>(null);
  readonly current = input.required<PopkinNavTab>();
  /** The unread messages, counted on Chat when above zero. */
  readonly unread = input(0);
  readonly wide = input(false);

  protected readonly tabs = computed(() =>
    TABS.map((tab) => ({ ...tab, link: `/p/${this.popkinId()}${tab.path}` })),
  );

  protected readonly unreadLabel = computed(() =>
    this.unread() === 1 ? '1 unread message' : `${this.unread()} unread messages`,
  );
}
