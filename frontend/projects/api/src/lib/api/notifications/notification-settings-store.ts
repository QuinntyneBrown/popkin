import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subject, debounceTime, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NotificationFrequency,
  NotificationKind,
  NotificationSettingsView,
  MuteCandidateView,
  PopkinLevelView,
  PopkinNotificationLevel,
} from '../../models/notifications';
import { DelayedLoading } from '../loading/delayed-loading';
import { Toaster } from '../toasts/toaster';
import { NOTIFICATIONS_API } from './notifications-api';
import { NotificationLinkIntent } from './notification-link';
import { PUSH_SUBSCRIBER } from './push-subscriber';

/** The three ways activity email can come, in the words of L2-156 AC1. */
export const FREQUENCY_CHOICES = [
  {
    value: 'AsItHappens',
    title: 'As it happens',
    sub: 'One email per change, bundled if several land within 10 minutes.',
  },
  {
    value: 'DailyDigest',
    title: 'Daily digest',
    sub: 'One email at 6 pm with everything from the day.',
  },
  { value: 'WeeklyDigest', title: 'Weekly digest', sub: 'Sunday evening, a round-up of the week.' },
] as const;

/** What a failed save says, as the control goes back (L2-155 AC5). */
export const SAVE_FAILED = 'We couldn’t save that. Try again.';

/** A phone switch turned on where the browser refused alerts (L2-157 AC5). */
export const DEVICE_REFUSED = 'This device hasn’t allowed alerts.';

/** The banner after email is switched off (L2-156 AC3). */
export const UNSUBSCRIBED_TEXT =
  'You’re unsubscribed from all Popkin email. Sign-in codes still arrive, and your phone alerts are unchanged.';

export type NotificationChannel = 'email' | 'phone';

/** The three levels, in the words of L2-158 AC1. */
export const LEVEL_CHOICES: readonly { value: PopkinNotificationLevel; label: string }[] = [
  { value: 'Everything', label: 'Everything' },
  { value: 'JustForMe', label: 'Just for me' },
  { value: 'Muted', label: 'Muted' },
];

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * The line under a Popkin's name on the Popkins view: its people and when it wraps up ("wraps up
 * Sunday" within the week, "until Nov 30" after, "ongoing" with no end), or, muted, what it still
 * sends (L2-158 AC3).
 */
export function popkinLine(
  popkin: Pick<PopkinLevelView, 'people' | 'endsAt' | 'level'>,
  now: Date = new Date(),
): string {
  if (popkin.level === 'Muted') return 'Muted. Nothing but reminders';
  const people = popkin.people === 1 ? '1 person' : `${popkin.people} people`;
  if (!popkin.endsAt) return `${people} · ongoing`;
  const ends = new Date(popkin.endsAt);
  const when =
    ends.getTime() - now.getTime() < WEEK
      ? `wraps up ${ends.toLocaleDateString('en-US', { weekday: 'long' })}`
      : `until ${ends.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  return `${people} · ${when}`;
}

/**
 * The Notifications screen (docs/detailed-designs/notifications/notification-settings): the
 * person's settings, read in one request, and each change saved at once. A change shows at once;
 * if saving fails it goes back and a toast says so (L2-155 AC5). One per screen; the page
 * provides it.
 */
@Injectable()
export class NotificationSettingsStore {
  private readonly api = inject(NOTIFICATIONS_API);
  private readonly toaster = inject(Toaster);
  private readonly devices = inject(PUSH_SUBSCRIBER);
  private readonly loading = new DelayedLoading();

  /** `pending` shows nothing yet; `loading` once 300 ms pass without an answer. */
  readonly state = this.loading.state;
  readonly settings = signal<NotificationSettingsView | null>(null);
  /** The banner the last change raised: email switched off (L2-156 AC3) or a Popkin muted (L2-158 AC4). */
  readonly banner = signal<'unsubscribed' | 'popkinMuted' | null>(null);
  /** The Popkin the muted bar is about, for its words and its "Undo". */
  private readonly mutedPopkin = signal<PopkinLevelView | null>(null);
  readonly mutedText = computed(() => {
    const popkin = this.mutedPopkin();
    return popkin ? `${popkin.name} is muted. You’ll still get its reminders.` : '';
  });
  /** The kinds whose phone switch was turned on here while this device refused alerts. */
  readonly refusedOnThisDevice = signal<ReadonlySet<NotificationKind>>(new Set());
  /** The people "Mute someone" offers for what was typed (L2-160 AC2). */
  readonly candidates = signal<MuteCandidateView[]>([]);
  private readonly searches = new Subject<string>();

  constructor() {
    // 250 ms after the last keystroke; a newer search drops the answer of an older one.
    this.searches
      .pipe(
        debounceTime(250),
        switchMap((q) => this.api.muteCandidates(q)),
        takeUntilDestroyed(),
      )
      .subscribe({ next: (people) => this.candidates.set(people) });
  }

  /** Reads the settings, then applies what a footer link asked for, if anything (L2-168 AC1). */
  open(intent?: NotificationLinkIntent): void {
    this.loading.begin();
    this.api.settings().subscribe({
      next: (settings) => {
        this.settings.set(settings);
        this.loading.ready();
        if (intent) this.applyLinkIntent(intent);
      },
      error: () => this.loading.failed(),
    });
  }

  /**
   * "Mute {Popkin}" mutes it as a tap would, with the bar that can undo it (L2-158 AC4). A Popkin
   * the person is not in changes nothing. "Stop birthday reminders" is applied with birthdays by person.
   */
  applyLinkIntent(intent: NotificationLinkIntent): void {
    if (intent.mute && 'popkinId' in intent.mute) this.setLevel(intent.mute.popkinId, 'Muted');
  }

  /** Every email switch and the frequency are off and disabled while email is off (AC3). */
  emailBlocked(): boolean {
    const email = this.settings()?.email;
    return !email?.available || !email.on;
  }

  setKind(kind: NotificationKind, channel: NotificationChannel, on: boolean): void {
    this.change(
      (settings) => ({
        ...settings,
        groups: settings.groups.map((group) => ({
          ...group,
          kinds: group.kinds.map((k) => (k.kind === kind ? { ...k, [channel]: on } : k)),
        })),
      }),
      this.api.setKind(kind, { [channel]: on }),
    );
    if (channel === 'phone') void this.checkDevice(kind, on);
  }

  /**
   * A phone switch turned on asks this browser to allow alerts (ADR 0028). If it refuses, the
   * switch stays on for the person's other devices and its row says so (L2-157 AC5).
   */
  private async checkDevice(kind: NotificationKind, on: boolean): Promise<void> {
    const refused = on && (await this.devices.subscribe()) === 'blocked';
    this.refusedOnThisDevice.update((kinds) => {
      const next = new Set(kinds);
      if (refused) next.add(kind);
      else next.delete(kind);
      return next;
    });
  }

  setEmail(on: boolean): void {
    this.change(
      (settings) => ({ ...settings, email: { ...settings.email, on } }),
      this.api.setEmail(on),
      () => this.banner.set(on ? null : 'unsubscribed'),
    );
  }

  setFrequency(frequency: NotificationFrequency): void {
    this.change(
      (settings) => ({ ...settings, email: { ...settings.email, frequency } }),
      this.api.setFrequency(frequency),
    );
  }

  /** One Popkin's level; Muted raises the bar that can undo it (L2-158 AC2, AC4). */
  setLevel(popkinId: string, level: PopkinNotificationLevel): void {
    const popkin = this.settings()?.popkins.find((p) => p.popkinId === popkinId);
    if (!popkin) return;
    this.change(
      (settings) => ({
        ...settings,
        popkins: settings.popkins.map((p) => (p.popkinId === popkinId ? { ...p, level } : p)),
      }),
      this.api.setLevel(popkinId, level),
      () => {
        this.mutedPopkin.set(level === 'Muted' ? popkin : null);
        this.banner.set(level === 'Muted' ? 'popkinMuted' : null);
      },
    );
  }

  searchMuteCandidates(q: string): void {
    this.searches.next(q);
  }

  /** Mutes someone; their row comes first (L2-160 AC1). */
  mute(membershipId: string): void {
    this.api.mute(membershipId).subscribe({
      next: (muted) =>
        this.settings.update((settings) =>
          settings
            ? {
                ...settings,
                muted: [muted, ...settings.muted.filter((m) => m.muteId !== muted.muteId)],
              }
            : settings,
        ),
      error: () => this.toaster.show('danger', SAVE_FAILED),
    });
  }

  /** Unmutes at once, and puts the row back if saving fails (L2-160 AC5). */
  unmute(muteId: string): void {
    this.change(
      (settings) => ({ ...settings, muted: settings.muted.filter((m) => m.muteId !== muteId) }),
      this.api.unmute(muteId),
    );
  }

  /** "Undo" on the muted bar: the Popkin goes back to Everything. */
  undo(): void {
    const popkin = this.mutedPopkin();
    if (this.banner() !== 'popkinMuted' || !popkin) return;
    this.setLevel(popkin.popkinId, 'Everything');
  }

  dismissBanner(): void {
    this.banner.set(null);
  }

  private change(
    apply: (settings: NotificationSettingsView) => NotificationSettingsView,
    save: Observable<void>,
    saved?: () => void,
  ): void {
    const before = this.settings();
    if (!before) return;
    this.settings.set(apply(before));
    save.subscribe({
      complete: () => saved?.(),
      error: () => {
        this.settings.set(before);
        this.toaster.show('danger', SAVE_FAILED);
      },
    });
  }
}
