import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge } from '../badge/badge';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TimeLeft } from '../time-left/time-left';

/** The places of a Popkin. */
export type PopkinNavTab = 'home' | 'chat' | 'plan' | 'schedule' | 'photos' | 'experiences';

/** The places of Contacts (L2-121 AC3). */
export type ContactsNavTab =
  'today' | 'people' | 'dates' | 'follow-ups' | 'habits' | 'groups' | 'connections';

interface Tab<K extends string = PopkinNavTab> {
  key: K;
  label: string;
  icon: IconName;
  /** The route after `/p/{id}`, or after `/contacts`. */
  path: string;
  /** Shown from 768 px only: a phone has five Contacts tabs (L2-121 AC4). */
  wideOnly?: boolean;
}

const TABS: readonly Tab[] = [
  { key: 'home', label: 'Home', icon: 'home', path: '' },
  { key: 'chat', label: 'Chat', icon: 'message', path: '/chat' },
  { key: 'plan', label: 'Plan', icon: 'board', path: '/plan' },
  { key: 'schedule', label: 'Schedule', icon: 'calendar', path: '/schedule' },
  { key: 'photos', label: 'Photos', icon: 'photos', path: '/photos' },
  { key: 'experiences', label: 'Experiences', icon: 'experiences', path: '/experiences' },
];

const CONTACTS_TABS: readonly Tab<ContactsNavTab>[] = [
  { key: 'today', label: 'Today', icon: 'sun', path: '' },
  { key: 'people', label: 'People', icon: 'users', path: '/people' },
  { key: 'dates', label: 'Dates', icon: 'cake', path: '/dates' },
  { key: 'follow-ups', label: 'Follow-ups', icon: 'list-checks', path: '/follow-ups' },
  { key: 'habits', label: 'Habits', icon: 'repeat', path: '/habits', wideOnly: true },
  { key: 'groups', label: 'Groups', icon: 'users-round', path: '/groups' },
  {
    key: 'connections',
    label: 'Connections',
    icon: 'network',
    path: '/connections',
    wideOnly: true,
  },
];

/**
 * Popkin tabs (docs/design-system/components/popkin-nav.html): Home, Chat, Plan while Plan is on
 * (L2-068 AC1), Schedule while Schedules is on (L2-072 AC1, L2-077 AC1), Photos and Experiences. Along the bottom on a phone; from 768 px a rail at the side of the screen, and
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
    '[attr.aria-label]': "place() === 'contacts' ? 'Contacts' : 'Popkin'",
  },
})
export class PopkinNav {
  /**
   * `contacts` is the navigation of Contacts (L2-121 AC3): the 📇 tile, "Contacts", its seven
   * tabs under `/contacts` with `contactsCurrent` marked, and Follow-ups badged with `due`.
   */
  readonly place = input<'popkin' | 'contacts'>('popkin');
  readonly popkinId = input('');
  readonly name = input('');
  readonly emoji = input('');
  /** The line under the name in the sidebar: "14 members". */
  readonly members = input('');
  /** The time the Popkin has left, in words; none when null. */
  readonly timeLeft = input<string | null>(null);
  readonly current = input<PopkinNavTab>('home');
  /** The unread messages, counted on Chat when above zero. */
  readonly unread = input(0);
  readonly wide = input(false);
  /** Whether Schedules is on: the Schedule tab shows between Chat and Photos. */
  readonly schedule = input(false);
  /** Whether Plan is on: the Plan tab shows between Chat and Schedule (or Photos). */
  readonly plan = input(false);
  readonly contactsCurrent = input<ContactsNavTab>('today');
  /** Follow-ups late or due today, counted on Follow-ups when above zero (L2-121 AC5). */
  readonly due = input(0);
  /** The badge's name: "2 follow-ups late or due today". */
  readonly dueLabel = input('');

  protected readonly contacts = computed(() => this.place() === 'contacts');
  protected readonly shownName = computed(() => (this.contacts() ? 'Contacts' : this.name()));
  protected readonly shownEmoji = computed(() => (this.contacts() ? '📇' : this.emoji()));

  protected readonly tabs = computed(() =>
    this.contacts() ? this.contactsTabs() : this.popkinTabs(),
  );

  private contactsTabs() {
    return CONTACTS_TABS.map((tab) => ({
      key: tab.key as string,
      label: tab.label,
      icon: tab.icon,
      wideOnly: tab.wideOnly ?? false,
      current: tab.key === this.contactsCurrent(),
      link: `/contacts${tab.path}`,
      badge: tab.key === 'follow-ups' ? this.due() : 0,
      badgeLabel: this.dueLabel(),
    }));
  }

  private popkinTabs() {
    return TABS.filter(
      (tab) => (tab.key !== 'schedule' || this.schedule()) && (tab.key !== 'plan' || this.plan()),
    ).map((tab) => ({
      key: tab.key as string,
      label: tab.label,
      icon: tab.icon,
      wideOnly: false,
      current: tab.key === this.current(),
      link: `/p/${this.popkinId()}${tab.path}`,
      badge: tab.key === 'chat' ? this.unread() : 0,
      badgeLabel: this.unreadLabel(),
    }));
  }

  protected readonly unreadLabel = computed(() =>
    this.unread() === 1 ? '1 unread message' : `${this.unread()} unread messages`,
  );
}
