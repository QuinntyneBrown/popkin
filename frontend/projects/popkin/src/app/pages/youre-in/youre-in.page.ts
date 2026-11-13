import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { JoinInviteState, accentOf, welcomeLine } from 'api';
import { Arrival, Button, Icon, Screen, StackAvatar } from 'components';

/** How many people stand around the tile. */
const CIRCLE = 6;

/**
 * The welcome a person sees once, right after joining (L2-014). It lives on what the join
 * answered; opened any other way it gives way to the invite, which sends a member to their
 * Popkin.
 */
@Component({
  selector: 'pk-youre-in-page',
  imports: [Arrival, Button, Icon, RouterLink, Screen],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './youre-in.page.html',
})
export class YoureInPage {
  private readonly state = inject(JoinInviteState);
  private readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';

  protected readonly joined = this.state.joined(this.code);
  protected readonly accent = accentOf(this.joined?.colour ?? 'Coral');
  protected readonly line = this.joined
    ? welcomeLine(this.joined.popkinName, this.joined.namedMembers, this.joined.othersCount)
    : '';
  protected readonly avatars = computed<StackAvatar[]>(() =>
    this.state
      .avatars(this.code)
      .slice(0, CIRCLE)
      .map((avatar) => ({
        initials: avatar.initials,
        accent: accentOf(avatar.accent),
        photo: avatar.photoUrl,
      })),
  );
  /** Asks the Everyone thread to put focus in its message field (L2-014 AC2). */
  protected readonly sayHi = { focus: 'composer' };

  constructor() {
    if (!this.joined) {
      void inject(Router).navigateByUrl(`/i/${this.code}`, { replaceUrl: true });
    }
  }
}
