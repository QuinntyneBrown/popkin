import { Injectable, computed, inject, signal } from '@angular/core';
import { PopkinHomeView } from '../../models/home';
import { accentOf } from '../../models/popkin';
import { membersLabel } from './home-text';
import { POPKINS_API } from './popkins-api';
import { timeLeft } from './time-left';

/**
 * What every screen inside a Popkin shows of it around its own content: its colour, and its
 * name, members and time left in the tabs. Read once and kept while the member moves between
 * the screens that share it. A screen stays usable without it.
 */
@Injectable()
export class PopkinFrame {
  private readonly popkins = inject(POPKINS_API);
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
    const endsAt = this.popkin()?.endsAt;
    return endsAt ? timeLeft(new Date(endsAt), new Date()) : null;
  });

  open(popkinId: string): void {
    if (popkinId === this.popkinId && this.popkin()) return;
    this.popkinId = popkinId;
    this.popkin.set(null);
    this.popkins.getHome(popkinId).subscribe({
      next: (popkin) => this.popkin.set(popkin),
      error: () => undefined,
    });
  }
}
