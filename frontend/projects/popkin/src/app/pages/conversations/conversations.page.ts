import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ConversationsStore,
  ErrorScreens,
  MessageRow,
  ThreadStore,
  UnreadTracker,
  accentOf,
  threadSub,
  timeLeft,
} from 'api';
import {
  AppScreen,
  Composer,
  Conversations,
  DayDivider,
  IconButton,
  Message,
  PersonAvatar,
  PopkinNav,
  SystemNote,
  Thread,
  ThreadPane,
  TopBar,
} from 'components';
import { ConversationList } from './conversation-list';

/**
 * The Chat tab of a Popkin (L2-022): the Everyone thread first, then the member's direct
 * messages, and "New message". From 1024 px the Everyone thread sits beside the list; it is
 * not read until it is seen there.
 */
@Component({
  selector: 'pk-conversations-page',
  imports: [
    AppScreen,
    Composer,
    Conversations,
    DayDivider,
    IconButton,
    Message,
    PopkinNav,
    RouterLink,
    SystemNote,
    Thread,
    ThreadPane,
    TopBar,
  ],
  providers: [ConversationsStore, ConversationList, ThreadStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './conversations.page.html',
})
export class ConversationsPage {
  readonly popkinId = input.required<string>();

  protected readonly list = inject(ConversationList);
  protected readonly thread = inject(ThreadStore);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);

  protected readonly state = this.list.store.state;
  protected readonly header = this.thread.thread;
  protected readonly accent = computed(() => accentOf(this.header()?.colour ?? 'Coral'));
  protected readonly text = signal('');

  private readonly now = signal(new Date());
  protected readonly timeLeft = computed(() => {
    const endsAt = this.header()?.endsAt;
    return endsAt ? timeLeft(new Date(endsAt), this.now()) : null;
  });
  protected readonly members = computed(() => {
    const count = this.header()?.memberCount ?? 0;
    return count === 1 ? '1 member' : `${count} members`;
  });
  protected readonly sub = computed(() => {
    const header = this.header();
    return header ? threadSub(header.memberCount, header.hereNow) : '';
  });
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    const minute = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(minute));

    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => {
        this.list.open(popkinId);
        this.thread.open(popkinId, undefined, { inView: false });
      });
    });
    effect(() => {
      const emoji = this.header()?.emoji;
      if (emoji) untracked(() => this.list.setEmoji(emoji));
    });
    effect(() => {
      if (this.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
  }

  protected newMessage(): void {
    const header = this.header();
    this.list.newMessage(header?.popkinName ?? 'this Popkin', this.accent());
  }

  protected reload(): void {
    this.list.store.retry();
  }

  protected send(text: string): void {
    this.thread.send(text);
    this.text.set('');
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
}
