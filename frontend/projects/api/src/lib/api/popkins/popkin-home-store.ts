import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, filter, interval } from 'rxjs';
import {
  ChatPreviewView,
  ExperiencesSummaryView,
  MemberView,
  PhotosSummaryView,
  PopkinHomeView,
} from '../../models/home';
import { CHAT_API } from '../chat/chat-api';
import { UnreadTracker } from '../chat/unread-tracker';
import { EXPERIENCES_API } from '../experiences/experiences-api';
import { PHOTOS_API } from '../photos/photos-api';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { timeLeftLine } from './home-text';
import { POPKINS_API } from './popkins-api';
import { timeLeft } from './time-left';

/** One block of the home, loaded and failing on its own (L2-019 AC8, AC9). */
export interface Section<T> {
  state: 'loading' | 'ready' | 'empty' | 'error';
  data: T | null;
}

export type HomeSection = 'chat' | 'photos' | 'experiences' | 'members';

const loading = { state: 'loading', data: null } as const;

/**
 * The home of one Popkin (docs/detailed-designs/popkins/popkin-home): its header and four
 * sections, each read on its own, kept current by what the hub says and by the clock. One per
 * screen; the page provides it.
 */
@Injectable()
export class PopkinHomeStore {
  private readonly popkins = inject(POPKINS_API);
  private readonly chatApi = inject(CHAT_API);
  private readonly photosApi = inject(PHOTOS_API);
  private readonly experiencesApi = inject(EXPERIENCES_API);
  private readonly realtime = inject(POPKIN_REALTIME);
  private readonly unread = inject(UnreadTracker);
  private readonly destroyRef = inject(DestroyRef);

  private popkinId = '';
  private readonly now = signal(new Date());

  /** `error` and `not-found` are the whole screen's; a section has its own. */
  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  readonly popkin = signal<PopkinHomeView | null>(null);
  readonly chat = signal<Section<ChatPreviewView>>(loading);
  readonly photos = signal<Section<PhotosSummaryView>>(loading);
  readonly experiences = signal<Section<ExperiencesSummaryView>>(loading);
  readonly members = signal<Section<MemberView[]>>(loading);

  /** "1 day 6 hrs left · Wraps up Sun, 6 pm"; null for a Popkin that keeps going. */
  readonly timeLeftLine = computed(() => timeLeftLine(this.popkin()?.endsAt ?? null, this.now()));
  /** "1 day 6 hrs left", as the sidebar reads it. */
  readonly timeLeft = computed(() => {
    const endsAt = this.popkin()?.endsAt;
    return endsAt ? timeLeft(new Date(endsAt), this.now()) : null;
  });
  /** Messages of the Everyone thread that are new to the member (L2-027 AC3). */
  readonly newCount = computed(() => {
    const threadId = this.chat().data?.threadId;
    return threadId ? this.unread.forThread(threadId) : (this.popkin()?.unreadCount ?? 0);
  });

  constructor() {
    const mine = takeUntilDestroyed(this.destroyRef);
    // L2-044 AC5: the time left is redrawn each minute.
    interval(60_000)
      .pipe(mine)
      .subscribe(() => this.now.set(new Date()));
    this.realtime.messageAdded$
      .pipe(
        filter((message) => message.threadId === this.chat().data?.threadId),
        mine,
      )
      .subscribe(() => this.readChat(true));
    this.realtime.memberJoined$
      .pipe(
        filter((joined) => joined.popkinId === this.popkinId),
        mine,
      )
      .subscribe(() => {
        this.readPopkin(true);
        this.readMembers(true);
      });
    this.realtime.photosAdded$
      .pipe(
        filter((added) => added.popkinId === this.popkinId),
        mine,
      )
      .subscribe(() => this.readPhotos(true));
    this.realtime.reconnected$.pipe(mine).subscribe(() => {
      if (this.state() === 'ready') this.readAll(true);
    });
  }

  open(popkinId: string): void {
    this.popkinId = popkinId;
    this.realtime.start();
    this.readAll(false);
  }

  /** Reads the whole home again, after it failed to open. */
  retry(): void {
    this.readAll(false);
  }

  retrySection(section: HomeSection): void {
    this.readers[section](false);
  }

  private readonly readers: Record<HomeSection, (quietly: boolean) => void> = {
    chat: (quietly) => this.readChat(quietly),
    photos: (quietly) => this.readPhotos(quietly),
    experiences: (quietly) => this.readExperiences(quietly),
    members: (quietly) => this.readMembers(quietly),
  };

  private readAll(quietly: boolean): void {
    this.readPopkin(quietly);
    for (const read of Object.values(this.readers)) read(quietly);
  }

  /** A quiet read keeps what is shown until its answer arrives, and if it fails. */
  private readPopkin(quietly: boolean): void {
    if (!quietly) this.state.set('loading');
    this.popkins.getHome(this.popkinId).subscribe({
      next: (popkin) => {
        this.now.set(new Date());
        this.popkin.set(popkin);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (notFound(error)) this.state.set('not-found');
        else if (!quietly) this.state.set('error');
      },
    });
  }

  private readChat(quietly: boolean): void {
    this.read(this.chat, this.chatApi.getEveryonePreview(this.popkinId), quietly, (preview) => {
      const popkin = this.popkin();
      this.unread.set({
        popkinId: this.popkinId,
        threadId: preview.threadId,
        viewerMembershipId: popkin?.viewer.membershipId ?? '',
        count: preview.newCount,
      });
      return preview.messages.length === 0;
    });
  }

  private readPhotos(quietly: boolean): void {
    this.read(this.photos, this.photosApi.getSummary(this.popkinId), quietly, (s) => s.count === 0);
  }

  private readExperiences(quietly: boolean): void {
    this.read(
      this.experiences,
      this.experiencesApi.getSummary(this.popkinId),
      quietly,
      (summary) => summary.count === 0,
    );
  }

  private readMembers(quietly: boolean): void {
    this.read(this.members, this.popkins.getMembers(this.popkinId), quietly, () => false);
  }

  private read<T>(
    section: { set(value: Section<T>): void },
    answer: Observable<T>,
    quietly: boolean,
    isEmpty: (data: T) => boolean,
  ): void {
    if (!quietly) section.set(loading);
    answer.subscribe({
      next: (data) => section.set({ state: isEmpty(data) ? 'empty' : 'ready', data }),
      error: (error: unknown) => {
        // No longer a member: the whole home is gone, not one section of it (L2-051).
        if (notFound(error)) this.state.set('not-found');
        else if (!quietly) section.set({ state: 'error', data: null });
      },
    });
  }
}

function notFound(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 404;
}
