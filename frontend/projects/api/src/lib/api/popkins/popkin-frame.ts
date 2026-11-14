import { Injectable, computed, inject, signal } from '@angular/core';
import { PopkinHomeView } from '../../models/home';
import { accentOf } from '../../models/popkin';
import { membersLabel } from './home-text';
import { POPKINS_API } from './popkins-api';
import { timeLeft } from './time-left';
import { applySettings } from './popkin-settings';
import { PopkinSettingsView } from '../../models/popkin';
import { photosGo, wrappedUpOn } from '../wrap-up/wrap-up-text';
import { WrapUpWatch } from '../wrap-up/wrap-up-watch';

/**
 * What every screen inside a Popkin shows of it around its own content: its colour, and its
 * name, members and time left in the tabs. Read once and kept while the member moves between
 * the screens that share it. A screen stays usable without it.
 */
@Injectable()
export class PopkinFrame {
  private readonly popkins = inject(POPKINS_API);
  private readonly watch = inject(WrapUpWatch);
  private popkinId = '';
  private readonly popkin = signal<PopkinHomeView | null>(null);

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
  readonly timeLeft = computed(() => {
    const popkin = this.popkin();
    return popkin?.endsAt && popkin.status === 'Active'
      ? timeLeft(new Date(popkin.endsAt), new Date())
      : null;
  });
  /** Once it has wrapped up nothing new is added to it (L2-045). */
  readonly wrappedUp = computed(() => this.popkin()?.status === 'WrappedUp');
  readonly isHost = computed(() => this.popkin()?.viewerRole === 'Host');
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

  open(popkinId: string): void {
    if (popkinId === this.popkinId && this.popkin()) return;
    this.popkinId = popkinId;
    this.popkin.set(null);
    this.popkins.getHome(popkinId).subscribe({
      next: (popkin) => {
        this.popkin.set(popkin);
        if (popkin.status === 'Active') this.watch.look(popkin.id, popkin.endsAt);
        else this.watch.look(null, null);
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
