import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { POPKIN_REALTIME } from '../realtime/popkin-realtime';
import { PopkinFeaturesView, PopkinHomeView } from '../../models/home';
import { accentOf } from '../../models/popkin';
import { membersLabel } from './home-text';
import { POPKINS_API } from './popkins-api';
import { timeLeft } from './time-left';
import { applySettings } from './popkin-settings';
import { PopkinSettingsView } from '../../models/popkin';
import { photosGo, wrappedUpOn } from '../wrap-up/wrap-up-text';
import { WrapUpWatch } from '../wrap-up/wrap-up-watch';

/** How often an open screen reads the Popkin's switches. */
export const FEATURES_EVERY_MS = 60_000;

/**
 * What every screen inside a Popkin shows of it around its own content: its colour, and its
 * name, members and time left in the tabs. Read once and kept while the member moves between
 * the screens that share it. A screen stays usable without it.
 */
@Injectable()
export class PopkinFrame {
  private readonly popkins = inject(POPKINS_API);
  private readonly watch = inject(WrapUpWatch);
  private readonly realtime = inject(POPKIN_REALTIME);
  private popkinId = '';
  private readonly popkin = signal<PopkinHomeView | null>(null);
  /** The latest read of the switches, newer than the header's (L2-077 AC4). */
  private readonly features = signal<PopkinFeaturesView | null>(null);
  private poll: ReturnType<typeof setInterval> | undefined;

  readonly accent = computed(() => {
    const popkin = this.popkin();
    return popkin ? accentOf(popkin.colour) : 'coral';
  });
  readonly name = computed(() => this.popkin()?.name ?? '');
  readonly emoji = computed(() => this.popkin()?.emoji ?? '');
  readonly members = computed(() => {
    const popkin = this.popkin();
    return popkin ? membersLabel(popkin.memberCount) : '';
  });
  readonly memberCount = computed(() => this.popkin()?.memberCount ?? 0);
  readonly timeLeft = computed(() => {
    const popkin = this.popkin();
    return popkin?.endsAt && popkin.status === 'Active'
      ? timeLeft(new Date(popkin.endsAt), new Date())
      : null;
  });
  /** Once it has wrapped up nothing new is added to it (L2-045). */
  readonly wrappedUp = computed(() => this.popkin()?.status === 'WrappedUp');
  readonly isHost = computed(() => this.popkin()?.viewerRole === 'Host');
  /** Whether Schedules is on; off until the Popkin is read (L2-077 AC1). */
  readonly schedules = computed(
    () => this.features()?.schedules ?? this.popkin()?.schedules ?? false,
  );
  /** Whether Plan is on; off until the Popkin is read (L2-077 AC1). */
  readonly plan = computed(() => this.features()?.plan ?? this.popkin()?.plan ?? false);
  /** "Wrapped up Sun 13 Sep". */
  readonly wrappedUpOn = computed(() => {
    const at = this.popkin()?.wrappedUpAt;
    return at ? wrappedUpOn(at) : null;
  });
  /** The banner of the last hour (L2-044 AC2). */
  readonly warning = computed(() => {
    const popkin = this.popkin();
    return popkin?.status === 'Active'
      ? this.watch.warningFor(popkin.id, popkin.name, popkin.endsAt)
      : null;
  });
  /** The notice of an album that was not kept, while its photos are still there (L2-045 AC4). */
  readonly photosGo = computed(() => {
    const popkin = this.popkin();
    return popkin && !popkin.photosRemovedAt ? photosGo(popkin.photosRemoveAt, new Date()) : null;
  });
  readonly photosRemoved = computed(() => !!this.popkin()?.photosRemovedAt);

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.realtime.popkinChanged$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe((change) => this.applySettings(change));
    destroyRef.onDestroy(() => clearInterval(this.poll));
  }

  open(popkinId: string): void {
    if (popkinId === this.popkinId && this.popkin()) return;
    this.popkinId = popkinId;
    this.popkin.set(null);
    this.features.set(null);
    // A switch reaches an open screen within a minute, with no event to every connection
    // (L2-076 AC10, L2-077 AC4); a failed read keeps the last answer.
    clearInterval(this.poll);
    this.poll = setInterval(() => this.readFeatures(popkinId), FEATURES_EVERY_MS);
    // The Host's changes reach the tabs too (L2-020 AC3, AC4).
    this.realtime.start();
    this.popkins.getHome(popkinId).subscribe({
      next: (popkin) => {
        this.popkin.set(popkin);
        if (popkin.status === 'Active') this.watch.look(popkin.id, popkin.endsAt);
        else this.watch.look(null, null);
      },
      error: () => undefined,
    });
  }

  private readFeatures(popkinId: string): void {
    this.popkins.getFeatures(popkinId).subscribe({
      next: (features) => {
        if (popkinId === this.popkinId) this.features.set(features);
      },
      error: () => undefined,
    });
  }

  /** The Host's change of the Popkin's settings (L2-020 AC3, AC4). */
  applySettings(change: PopkinSettingsView): void {
    const held = this.popkin();
    const changed = applySettings(held, change);
    if (!changed || changed === held) return;
    this.popkin.set(changed);
    this.watch.look(changed.id, changed.endsAt);
  }

  dismissWarning(): void {
    this.watch.dismissWarning(this.popkinId);
  }
}
