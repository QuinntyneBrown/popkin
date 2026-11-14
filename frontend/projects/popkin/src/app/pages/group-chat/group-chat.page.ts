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
  viewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  CallBannerStore,
  ConversationsStore,
  DraftStore,
  ErrorScreens,
  MessageOutbox,
  MessageRow,
  NETWORK_STATUS,
  POPKIN_REALTIME,
  PopkinFrame,
  ThreadStore,
  WrapUpWatch,
  UnreadTracker,
  accentOf,
  othersHere,
  threadSub,
  timeLeft,
} from 'api';
import {
  AppScreen,
  Banner,
  Button,
  Chip,
  Composer,
  Conversations,
  DayDivider,
  DetailPane,
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
import { Toaster } from '../../toasts/toaster';
import { ConversationList } from '../conversations/conversation-list';
import { MessageActions } from '../conversations/message-actions';

/** How long "Back online. 2 messages sent." stays. */
const BACK_ONLINE_MS = 5_000;

/**
 * The Everyone thread of a Popkin (L2-021): its messages by day, live as they are sent
 * (L2-027), with a message that cannot be sent kept and marked (L2-028). It composes `pk-*`
 * components over `ThreadStore`, which holds the rules.
 */
@Component({
  selector: 'pk-group-chat-page',
  imports: [
    IconButton,
    AppScreen,
    Banner,
    Button,
    Chip,
    Composer,
    Conversations,
    DayDivider,
    DetailPane,
    EmptyState,
    Icon,
    ListPane,
    Message,
    PopkinNav,
    RouterLink,
    Screen,
    SystemNote,
    Thread,
    TopBar,
  ],
  providers: [
    ThreadStore,
    CallBannerStore,
    PopkinFrame,
    ConversationsStore,
    ConversationList,
    MessageActions,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-chat.page.html',
})
export class GroupChatPage {
  /** The Popkin, from the route. */
  readonly popkinId = input.required<string>();

  protected readonly store = inject(ThreadStore);
  protected readonly actions = inject(MessageActions);
  protected readonly list = inject(ConversationList);
  /** The group call under way, if there is one (L2-029 AC2). */
  protected readonly call = inject(CallBannerStore).banner;
  private readonly calls = inject(CallBannerStore);
  private readonly drafts = inject(DraftStore);
  private readonly outbox = inject(MessageOutbox);
  private readonly unread = inject(UnreadTracker);
  private readonly network = inject(NETWORK_STATUS);
  private readonly toaster = inject(Toaster);
  private readonly errors = inject(ErrorScreens);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly composer = viewChild(Composer);
  private readonly threadView = viewChild(Thread);
  private readonly messageViews = viewChildren(Message);

  protected readonly openers = ['👋 Hey everyone!', 'So glad you’re here', 'Who’s coming?'];
  protected readonly skeletons = [
    { mine: false, width: 60 },
    { mine: false, width: 40 },
    { mine: true, width: 50 },
    { mine: false, width: 70 },
    { mine: true, width: 30 },
  ] as const;
  /** The minute, so the time left stays current (L2-044 AC5). */
  private readonly now = signal(new Date());
  protected readonly timeLeft = computed(() => {
    const endsAt = this.thread()?.endsAt;
    return endsAt ? timeLeft(new Date(endsAt), this.now()) : null;
  });

  protected readonly text = signal('');
  protected readonly offline = computed(() => !this.network.online());
  /** How many messages went out when the connection returned; null when there is nothing to say. */
  protected readonly sentOnReturn = signal<number | null>(null);

  /** What the Popkin itself says once it has wrapped up: when it did (L2-045 AC1). */
  private readonly frame = inject(PopkinFrame);
  protected readonly thread = this.store.thread;
  protected readonly readOnly = computed(() => !!this.thread()?.readOnly);
  private readonly watch = inject(WrapUpWatch);
  /** The banner of the Popkin's last hour (L2-044 AC2). */
  protected readonly warning = computed(() => {
    const thread = this.thread();
    return thread && !thread.readOnly
      ? this.watch.warningFor(thread.popkinId, thread.popkinName, thread.endsAt)
      : null;
  });
  protected readonly closedLine =
    'This Popkin has wrapped up. Messages stay, but nobody can post new ones.';
  protected readonly state = this.store.state;
  protected readonly accent = computed(() => accentOf(this.thread()?.colour ?? 'Coral'));
  protected readonly sub = computed(() => {
    const thread = this.thread();
    if (!thread) return this.state() === 'loading' ? 'Loading…' : '';
    if (thread.readOnly) return this.frame.wrappedUpOn() ?? '';
    return threadSub(thread.memberCount, thread.hereNow);
  });
  protected readonly members = computed(() => {
    const count = this.thread()?.memberCount ?? 0;
    return count === 1 ? '1 member' : `${count} members`;
  });
  protected readonly unreadCount = computed(() => {
    const thread = this.thread();
    return thread ? this.unread.forPopkin(thread.popkinId) : 0;
  });
  protected readonly fieldLabel = computed(() =>
    this.state() === 'empty' ? 'Say hello…' : 'Message everyone',
  );

  protected readonly hereNow = computed(() => {
    const me = this.thread()?.viewer.membershipId;
    return this.store.hereNow().map((member) => ({
      name: member.membershipId === me ? `${member.displayName} (you)` : member.displayName,
      avatar: {
        initials: member.avatar.initials,
        accent: accentOf(member.avatar.accent),
        photoUrl: member.avatar.photoUrl,
      },
    }));
  });
  protected readonly others = computed(
    () => othersHere(this.thread()?.memberCount ?? 0, this.store.hereNow().length) ?? '',
  );

  constructor() {
    const router = inject(Router);
    // Coming from the welcome, the message field takes focus (L2-014 AC2).
    const focusComposer =
      (router.currentNavigation()?.extras.state ?? history.state)?.['focus'] === 'composer';

    const minute = setInterval(() => this.now.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(minute));

    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => {
        this.store.open(popkinId);
        this.calls.open(popkinId);
        this.list.open(popkinId);
      });
    });

    effect(() => {
      const emoji = this.thread()?.emoji;
      if (emoji) untracked(() => this.list.setEmoji(emoji));
    });
    effect(() => {
      if (this.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
    effect(() => {
      if (this.readOnly()) untracked(() => this.frame.open(this.popkinId()));
    });

    // Once the thread is known: the draft left here earlier, the latest in view, and focus.
    let opened = false;
    effect(() => {
      const thread = this.thread();
      const state = this.state();
      if (opened || !thread || (state !== 'ready' && state !== 'empty')) return;
      opened = true;
      untracked(() => {
        if (!this.text()) this.text.set(this.drafts.get(thread.id));
        afterNextRender(
          () => {
            this.threadView()?.scrollToLatest('instant');
            if (focusComposer) this.composer()?.focus();
          },
          { injector: this.injector },
        );
      });
    });

    effect(() => {
      const thread = this.thread();
      const text = this.text();
      if (thread && opened) untracked(() => this.drafts.set(thread.id, text));
    });

    this.store.added$.pipe(takeUntilDestroyed()).subscribe(() => this.showLatest());

    this.network.backOnline$.pipe(takeUntilDestroyed()).subscribe(() => {
      const count = this.outbox.sendWaiting();
      if (count === 0) return;
      this.sentOnReturn.set(count);
      const timer = setTimeout(() => this.sentOnReturn.set(null), BACK_ONLINE_MS);
      this.destroyRef.onDestroy(() => clearTimeout(timer));
    });

    this.outbox.rateLimited$.pipe(takeUntilDestroyed()).subscribe((seconds) => {
      this.toaster.show('warning', 'Slow down a little', sendAgainIn(seconds));
    });

    inject(POPKIN_REALTIME)
      .memberJoined$.pipe(takeUntilDestroyed())
      .subscribe(({ popkinId, member }) => {
        if (popkinId !== this.thread()?.popkinId) return;
        this.toaster.show('info', `${member.firstName} popped in`, 'Say hi! 👋');
      });
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

  protected sentMessages(count: number): string {
    return count === 1 ? '1 message sent.' : `${count} messages sent.`;
  }

  protected send(text: string): void {
    this.store.send(text);
    this.text.set('');
    this.composer()?.focus();
  }

  protected useOpener(opener: string): void {
    this.text.set(opener);
    this.composer()?.focus();
  }

  protected retry(row: MessageRow): void {
    if (row.clientMessageId) this.store.retry(row.clientMessageId);
  }

  protected discard(row: MessageRow): void {
    if (row.clientMessageId) this.store.discard(row.clientMessageId);
  }

  /** Goes to the message a reply quotes, loading earlier ones if need be (L2-025 AC3). */
  protected async goToQuote(messageId: string): Promise<void> {
    if (!(await this.store.jumpTo(messageId))) return;
    afterNextRender(
      () =>
        this.messageViews()
          .find((view) => view.messageId() === messageId)
          ?.reveal(),
      { injector: this.injector },
    );
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
    this.store.open(this.popkinId());
  }

  /** Brings a message added at the end into view once it is drawn. */
  private showLatest(): void {
    afterNextRender(() => this.threadView()?.scrollToLatest('smooth'), {
      injector: this.injector,
    });
  }
}

/** "You can send again in 30 seconds." (L2-053 AC4). */
function sendAgainIn(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return 'You can send again in a moment.';
  if (seconds < 60)
    return `You can send again in ${seconds} ${seconds === 1 ? 'second' : 'seconds'}.`;
  const minutes = Math.ceil(seconds / 60);
  return `You can send again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`;
}
