import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PopkinFeature } from '../../models/home';
import { CreatePopkinRequest } from '../../models/popkin';
import { Toaster } from '../toasts/toaster';
import { NewPopkinDraft } from './new-popkin-draft';
import { comingSundayEvening, resolveEndsAt } from './popkin-length';
import { POPKINS_API } from './popkins-api';

/**
 * Creates the Popkin of the draft from whichever step is the last: "How long should it last?"
 * when no feature is offered, else "What should it have?" (L2-009 AC4, L2-152 AC2, AC4). A
 * failure keeps every choice (L2-009 AC5, L2-152 AC5).
 */
@Injectable({ providedIn: 'root' })
export class NewPopkinCreator {
  private readonly store = inject(NewPopkinDraft);
  private readonly popkins = inject(POPKINS_API);
  private readonly router = inject(Router);
  private readonly toaster = inject(Toaster);

  readonly status = signal<'idle' | 'popping' | 'failed'>('idle');

  /** The end "Until a date" shows: the one picked, else the coming Sunday evening. */
  customEnd(now = new Date()): Date {
    const picked = this.store.draft().customEndsAt;
    return picked ? new Date(picked) : comingSundayEvening(now);
  }

  /** Sends the draft with the choice of each offered feature (L2-152 AC7). */
  popItUp(offered: readonly PopkinFeature[]): void {
    if (this.status() === 'popping') return;
    const draft = this.store.draft();
    const endsAt = resolveEndsAt(draft.length, new Date(), this.customEnd());
    const request: CreatePopkinRequest = {
      name: draft.name.trim(),
      emoji: draft.emoji,
      colour: draft.colour,
      length: draft.length,
      endsAt: endsAt?.toISOString() ?? null,
    };
    if (offered.includes('Plan')) request.plan = draft.features.plan;
    if (offered.includes('Schedules')) request.schedules = draft.features.schedules;
    this.status.set('popping');
    this.popkins.createPopkin(request).subscribe({
      next: (created) => {
        if (draft.crewOf) this.inviteCrew(created.id, draft.crewOf);
        void this.router.navigateByUrl(`/p/${created.id}/created`).then(() => {
          this.store.reset();
          this.status.set('idle');
        });
      },
      error: () => this.status.set('failed'),
    });
  }

  /** A step that opens starts without the last attempt's failure. */
  clear(): void {
    if (this.status() === 'failed') this.status.set('idle');
  }

  /** "Pop up another with this crew" (L2-046 AC5): the new Popkin is there either way. */
  private inviteCrew(popkinId: string, crewOf: string): void {
    this.popkins.inviteCrew(popkinId, crewOf).subscribe({
      next: () =>
        this.toaster.show(
          'success',
          'Invites are on their way',
          'Everyone from the last Popkin gets one.',
        ),
      error: () =>
        this.toaster.show(
          'danger',
          'We couldn’t invite the crew',
          'Share the code or the link with them instead.',
        ),
    });
  }
}
