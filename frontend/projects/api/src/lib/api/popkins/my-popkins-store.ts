import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { AvatarView } from '../../models/invite';
import { MyPopkinsView } from '../../models/my-popkins';
import { accentOf } from '../../models/popkin';
import { SessionStore } from '../auth/session.store';
import { NETWORK_STATUS } from '../chat/network-status';
import { UnreadTracker } from '../chat/unread-tracker';
import { ErrorScreens } from '../error-screens';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { membersLabel } from './home-text';
import { cardTimeLeft, latestLine, unreadLabel, wrappedLine } from './my-popkins-text';
import { POPKINS_API } from './popkins-api';
import { POPKINS_SNAPSHOT } from './popkins-snapshot';

/** An active Popkin as its card draws it (L2-017 AC1, AC2). */
export interface PopkinCardView {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  /** "Mara: last call for the canoe sign-up". */
  latest: string;
  avatars: AvatarView[];
  /** The members the avatars do not show: "+11". */
  more: number;
  members: string;
  timeLeft: string;
  /** It has no end. */
  ongoing: boolean;
  /** Messages not yet read; the badge shows "99+" above 99 (L2-017 AC2). */
  unread: number;
  /** What the badge counts, for assistive technology; empty with nothing unread. */
  unreadLabel: string;
}

/** A wrapped-up Popkin as its row draws it (L2-018 AC1). */
export interface WrappedRowView {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  line: string;
}

/**
 * My Popkins (docs/detailed-designs/popkins/my-popkins): the Popkins a person belongs to, kept
 * current by what the hub says and by the clock, and shown from what was saved last time when
 * the device is offline. One per screen; the page provides it.
 */
@Injectable()
export class MyPopkinsStore {
  private readonly popkins = inject(POPKINS_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly unread = inject(UnreadTracker);
  private readonly network = inject(NETWORK_STATUS);
  private readonly snapshot = inject(POPKINS_SNAPSHOT);
  private readonly sessions = inject(SessionStore);
  private readonly errorScreens = inject(ErrorScreens);

  private readonly now = signal(new Date());
  private readonly view = signal<MyPopkinsView>({ active: [], wrappedUp: [] });
  /** The list shown is the one saved last time, not one the API just gave. */
  private readonly fromSnapshot = signal(false);

  readonly state = signal<'loading' | 'ready' | 'empty' | 'error'>('loading');
  /** The device has no connection: what shows may be out of date (L2-056 AC4). */
  readonly offline = computed(() => this.fromSnapshot() || !this.network.online());

  readonly cards = computed<PopkinCardView[]>(() =>
    this.view().active.map((popkin) => {
      const count = this.unread.forThread(popkin.everyoneThreadId);
      return {
        id: popkin.id,
        name: popkin.name,
        emoji: popkin.emoji,
        accent: accentOf(popkin.colour),
        latest: latestLine(popkin.latestMessage),
        avatars: popkin.avatars,
        more: Math.max(0, popkin.memberCount - popkin.avatars.length),
        members: membersLabel(popkin.memberCount),
        timeLeft: cardTimeLeft(popkin.endsAt, this.now()),
        ongoing: popkin.endsAt === null,
        unread: count,
        unreadLabel: unreadLabel(count) ?? '',
      };
    }),
  );

  readonly wrapped = computed<WrappedRowView[]>(() =>
    this.view().wrappedUp.map((popkin) => ({
      id: popkin.id,
      name: popkin.name,
      emoji: popkin.emoji,
      accent: accentOf(popkin.colour),
      line: wrappedLine(popkin.wrappedUpAt, popkin.peopleCount, popkin.photoCount, this.now()),
    })),
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    const mine = takeUntilDestroyed(destroyRef);
    // L2-044 AC5: the time left is redrawn each minute.
    interval(60_000)
      .pipe(mine)
      .subscribe(() => this.now.set(new Date()));
    this.realtime.messageAdded$.pipe(takeUntilDestroyed(destroyRef)).subscribe((message) => {
      if (message.kind !== 'Member') return;
      const active = this.view().active;
      const popkin = active.find((one) => one.everyoneThreadId === message.threadId);
      if (!popkin) return;
      const latestMessage = { firstName: message.author.firstName, text: message.text };
      // The most recently active Popkin is first (L2-017).
      this.view.update((view) => ({
        ...view,
        active: [{ ...popkin, latestMessage }, ...active.filter((one) => one !== popkin)],
      }));
    });
    this.realtime.memberJoined$.pipe(mine).subscribe(() => this.read(true));
    this.realtime.memberLeft$.pipe(mine).subscribe(() => this.read(true));
    this.realtime.reconnected$.pipe(mine).subscribe(() => this.read(true));
    this.network.backOnline$.pipe(mine).subscribe(() => this.read(true));
  }

  open(): void {
    this.realtime.start();
    this.read(false);
  }

  /** Reads the list again, after it failed to load. */
  retry(): void {
    this.read(false);
  }

  /** A quiet read keeps what is shown until its answer arrives, and if it fails. */
  private read(quietly: boolean): void {
    if (!quietly) this.state.set('loading');
    this.popkins.listMine().subscribe({
      next: (view) => {
        this.show(view);
        this.fromSnapshot.set(false);
        const personId = this.sessions.session()?.personId;
        if (personId) this.snapshot.write(personId, withoutPhotos(view));
      },
      error: () => {
        if (quietly) return;
        if (this.network.online()) {
          this.state.set('error');
          return;
        }
        const personId = this.sessions.session()?.personId;
        const saved = personId ? this.snapshot.read(personId) : null;
        if (saved) {
          this.show(saved);
          this.fromSnapshot.set(true);
        } else {
          this.errorScreens.showOffline('/popkins');
        }
      },
    });
  }

  private show(view: MyPopkinsView): void {
    this.now.set(new Date());
    for (const popkin of view.active) {
      this.unread.setPopkin({
        popkinId: popkin.id,
        everyoneThreadId: popkin.everyoneThreadId,
        viewerMembershipId: popkin.viewerMembershipId,
        count: popkin.unreadCount,
      });
    }
    this.view.set(view);
    this.state.set(view.active.length || view.wrappedUp.length ? 'ready' : 'empty');
  }
}

/** A photo's address expires within the hour, so a saved list keeps the initials only. */
function withoutPhotos(view: MyPopkinsView): MyPopkinsView {
  return {
    ...view,
    active: view.active.map((popkin) => ({
      ...popkin,
      avatars: popkin.avatars.map((avatar) => ({ ...avatar, photoUrl: null })),
    })),
  };
}
