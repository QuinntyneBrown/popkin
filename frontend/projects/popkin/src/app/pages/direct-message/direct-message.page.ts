import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  CallBannerStore,
  ConversationsStore,
  DraftStore,
  ErrorScreens,
  MessageRow,
  NETWORK_STATUS,
  ThreadStore,
  UnreadTracker,
  WrapUpWatch,
  accentOf,
  timeLeft,
} from 'api';
import {
  AppScreen,
  Banner,
  Button,
  Composer,
  Conversations,
  DayDivider,
  DetailPane,
  DmIntro,
  EmptyState,
  Icon,
  IconButton,
  ListPane,
  Message,
  PersonAvatar,
  PopkinNav,
  Screen,
  SystemNote,
  Thread,
  TopBar,
} from 'components';
import { ConversationList } from '../conversations/conversation-list';

/**
 * A direct message between the member and one other member of a Popkin (L2-023), which only
 * the two of them can read. It works as the Everyone thread does, over the same `ThreadStore`;
 * "Call {first name}" opens a call between the two (L2-030 AC8), and a call the other member
 * starts shows as a banner here.
 */
@Component({
  selector: 'pk-direct-message-page',
  imports: [
    AppScreen,
    Banner,
    Button,
    Composer,
    Conversations,
    DayDivider,
    DetailPane,
    DmIntro,
    EmptyState,
    Icon,
    IconButton,
    ListPane,
    Message,
    PopkinNav,
    RouterLink,
    Screen,
    SystemNote,
    Thread,
    TopBar,
  ],
  providers: [ThreadStore, CallBannerStore, ConversationsStore, ConversationList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './direct-message.page.html',
})
export class DirectMessagePage {
  readonly popkinId = input.required<string>();
  /** The other member's membership id. */
  readonly memberId = input.required<string>();

  protected readonly store = inject(ThreadStore);
  protected readonly list = inject(ConversationList);
  protected readonly call = inject(CallBannerStore).banner;
  private readonly calls = inject(CallBannerStore);
  private readonly drafts = inject(DraftStore);
  private readonly unread = inject(UnreadTracker);
  private readonly network = inject(NETWORK_STATUS);
  private readonly errors = inject(ErrorScreens);
  private readonly watch = inject(WrapUpWatch);
  private readonly injector = inject(Injector);

  private readonly composer = viewChild(Composer);
  private readonly threadView = viewChild(Thread);

  protected readonly skeletons = [
    { mine: false, width: 60 },
    { mine: true, width: 40 },
    { mine: false, width: 50 },
    { mine: true, width: 30 },
  ] as const;
  protected readonly closedLine =
    'This Popkin has wrapped up. Messages stay, but nobody can post new ones.';

  protected readonly thread = this.store.thread;
  protected readonly state = this.store.state;
  protected readonly readOnly = computed(() => !!this.thread()?.readOnly);
  protected readonly accent = computed(() => accentOf(this.thread()?.colour ?? 'Coral'));
  protected readonly offline = computed(() => !this.network.online());
  protected readonly text = signal('');

  /** The other member, as the header, the intro and the person pane show them. */
  protected readonly other = computed(() => {
    const other = this.thread()?.other;
    if (!other) return null;
    const avatar: PersonAvatar = {
      initials: other.avatar.initials,
      accent: accentOf(other.avatar.accent),
      photoUrl: other.avatar.photoUrl,
    };
    return { name: other.displayName, firstName: other.firstName, avatar };
  });
  protected readonly from = computed(() => {
    const thread = this.thread();
    return thread ? `From ${thread.emoji} ${thread.popkinName}` : '';
  });
  protected readonly callLabel = computed(() => `Call ${this.other()?.firstName ?? ''}`.trim());
  protected readonly fieldLabel = computed(() => `Message ${this.other()?.firstName ?? ''}`.trim());
  protected readonly hello = computed(
    () => `Say hello to ${this.other()?.firstName ?? 'them'}. This is the start of your chat.`,
  );

  private readonly now = signal(new Date());
  protected readonly timeLeft = computed(() => {
    const endsAt = this.thread()?.endsAt;
    return endsAt ? timeLeft(new Date(endsAt), this.now()) : null;
  });
  protected readonly members = computed(() => {
    const count = this.thread()?.memberCount;
    return count === undefined ? '' : count === 1 ? '1 member' : `${count} members`;
  });
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));
  protected readonly warning = computed(() => {
    const thread = this.thread();
    return thread && !thread.readOnly
      ? this.watch.warningFor(thread.popkinId, thread.popkinName, thread.endsAt)
      : null;
  });

  constructor() {
    const minute = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(minute));

    effect(() => {
      const popkinId = this.popkinId();
      const memberId = this.memberId();
      untracked(() => {
        this.store.open(popkinId, memberId);
        this.list.open(popkinId);
      });
    });
    // The call of this direct message, once its thread is known.
    let following: string | null = null;
    effect(() => {
      const thread = this.thread();
      if (!thread || thread.id === following) return;
      following = thread.id;
      untracked(() => {
        this.calls.open(thread.popkinId, thread.id);
        this.list.setEmoji(thread.emoji);
      });
    });
    effect(() => {
      if (this.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });

    // Once the thread is known: the draft left here earlier, and the latest in view.
    let opened = false;
    effect(() => {
      const thread = this.thread();
      const state = this.state();
      if (opened || !thread || (state !== 'ready' && state !== 'empty')) return;
      opened = true;
      untracked(() => {
        if (!this.text()) this.text.set(this.drafts.get(thread.id));
        afterNextRender(() => this.threadView()?.scrollToLatest('instant'), {
          injector: this.injector,
        });
      });
    });
    effect(() => {
      const thread = this.thread();
      const text = this.text();
      if (thread && opened) untracked(() => this.drafts.set(thread.id, text));
    });

    this.store.added$.pipe(takeUntilDestroyed()).subscribe(() =>
      afterNextRender(() => this.threadView()?.scrollToLatest('smooth'), {
        injector: this.injector,
      }),
    );
  }

  protected avatarOf(row: MessageRow): PersonAvatar | undefined {
    return row.avatar
      ? {
          initials: row.avatar.initials,
          accent: accentOf(row.avatar.accent),
          photoUrl: row.avatar.photoUrl,
        }
      : undefined;
  }

  protected send(text: string): void {
    this.store.send(text);
    this.text.set('');
    this.composer()?.focus();
  }

  protected retry(row: MessageRow): void {
    if (row.clientMessageId) this.store.retry(row.clientMessageId);
  }

  protected discard(row: MessageRow): void {
    if (row.clientMessageId) this.store.discard(row.clientMessageId);
  }

  protected loadEarlier(): void {
    const view = this.threadView();
    if (!view || !this.store.hasEarlier()) return;
    void this.store.loadEarlier((change) => view.keepPlace(change));
  }

  protected jumpToLatest(): void {
    this.threadView()?.scrollToLatest('smooth');
  }

  protected dismissWarning(): void {
    this.watch.dismissWarning(this.popkinId());
  }

  protected newMessage(): void {
    this.list.newMessage(this.thread()?.popkinName ?? 'this Popkin', this.accent());
  }

  protected reload(): void {
    this.store.open(this.popkinId(), this.memberId());
  }
}
