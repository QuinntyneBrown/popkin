import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CallSession, accentOf } from 'api';
import {
  Button,
  CallAside,
  CallAsidePerson,
  CallControls,
  CallGrid,
  CallScreen,
  CallTile,
  Icon,
  IconButton,
  StageMessage,
  TopBar,
} from 'components';
import { InviteData, InviteDialog } from '../../dialogs/invite/invite.dialog';

/**
 * A Popkin's group call (L2-029, L2-030): the tiles of who is on it, Mute, Camera and Leave.
 * Opening it starts the call or joins the one under way; the call itself belongs to
 * `CallSession`, so "Minimise call" leaves this screen with the call still running.
 */
@Component({
  selector: 'pk-video-call-page',
  imports: [
    Button,
    CallAside,
    CallControls,
    CallGrid,
    CallScreen,
    CallTile,
    Icon,
    IconButton,
    RouterLink,
    StageMessage,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-call.page.html',
})
export class VideoCallPage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  protected readonly session = inject(CallSession);
  private readonly router = inject(Router);
  private readonly dialog = inject(Dialog);

  protected readonly home = computed(() => `/p/${this.popkinId()}`);
  protected readonly popkin = this.session.popkin;
  protected readonly status = this.session.status;
  /** What the stage holds: a message, the member alone, or the tiles of a call with others. */
  protected readonly layout = computed(() => {
    if (this.status() !== 'connected') return 'message';
    return this.session.alone() ? 'alone' : 'call';
  });
  protected readonly tiles = computed(() =>
    this.session.tiles().map((tile) => ({
      ...tile,
      avatar: { ...tile.avatar, accent: accentOf(tile.avatar.accent) },
    })),
  );
  protected readonly rest = computed(() => {
    const more = this.session.more();
    return more > 0 ? `${more} more on the call` : null;
  });
  protected readonly gridCount = computed(() => this.tiles().length + (this.rest() ? 1 : 0));
  protected readonly people = computed<CallAsidePerson[]>(() =>
    this.session.roster().map((row) => ({
      id: row.membershipId,
      name: row.name,
      avatar: { ...row.avatar, accent: accentOf(row.avatar.accent) },
      microphone: row.state,
    })),
  );

  constructor() {
    // The screen of the app the member came from, which Leave opens (L2-030 AC6).
    const from = this.router.getCurrentNavigation()?.previousNavigation?.finalUrl?.toString();
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => this.session.start(popkinId, from ?? `/p/${popkinId}`));
    });
  }

  protected leave(): void {
    const returnUrl = this.session.returnUrl() || this.home();
    this.session.leave();
    void this.router.navigateByUrl(returnUrl);
  }

  /** "Invite to call": the Popkin's invite; whoever joins sees the call's banner. */
  protected invite(): void {
    this.dialog.open<void, InviteData>(InviteDialog, {
      data: { popkinId: this.popkinId(), accent: this.popkin()?.accent ?? '' },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
  }
}
