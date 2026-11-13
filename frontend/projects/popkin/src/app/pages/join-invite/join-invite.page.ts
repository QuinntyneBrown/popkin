import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AvatarView,
  INVITES_API,
  InvitePreviewView,
  JoinInviteState,
  SessionStore,
  accentOf,
  hereUntil,
  peopleCount,
  toApiProblem,
  tryAgainIn,
  wrappedUpLine,
} from 'api';
import {
  Button,
  EmptyState,
  Icon,
  InvitePreview,
  Legal,
  Screen,
  Skeleton,
  SplitAside,
  StackAvatar,
  TimeLeft,
  Wordmark,
} from 'components';

type Problem = { kind: 'not-found' } | { kind: 'failed' } | { kind: 'limited'; text: string };

/**
 * The invite screen: what an invite link or a scanned code opens (L2-012, L2-016). It shows a
 * visitor only what the preview answers, and sends a member straight to their Popkin.
 */
@Component({
  selector: 'pk-join-invite-page',
  imports: [
    Button,
    EmptyState,
    Icon,
    InvitePreview,
    Legal,
    RouterLink,
    Screen,
    Skeleton,
    SplitAside,
    TimeLeft,
    Wordmark,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './join-invite.page.html',
})
export class JoinInvitePage {
  private readonly invites = inject(INVITES_API);
  private readonly state = inject(JoinInviteState);
  private readonly router = inject(Router);
  private readonly session = inject(SessionStore);

  protected readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
  protected readonly preview = signal<InvitePreviewView | null>(null);
  protected readonly problem = signal<Problem | null>(null);
  protected readonly signedIn = computed(() => !!this.session.session());

  protected readonly accent = computed(() => accentOf(this.preview()?.colour ?? 'Coral'));
  protected readonly wrappedUp = computed(() => this.preview()?.state === 'WrappedUp');
  protected readonly avatars = computed(() => (this.preview()?.avatars ?? []).map(toStackAvatar));
  protected readonly inviterAvatar = computed(() => {
    const preview = this.preview();
    return preview ? toStackAvatar(preview.inviter.avatar) : undefined;
  });
  protected readonly more = computed(() => {
    const preview = this.preview();
    return preview ? Math.max(0, preview.memberCount - preview.avatars.length) : 0;
  });
  protected readonly people = computed(() => peopleCount(this.preview()?.memberCount ?? 0));
  protected readonly until = computed(() => {
    const endsAt = this.preview()?.endsAt;
    return endsAt ? hereUntil(new Date(endsAt), new Date()) : null;
  });
  protected readonly wrappedLine = computed(() => {
    const preview = this.preview();
    if (!preview || preview.state !== 'WrappedUp') return undefined;
    const when = preview.wrappedUpAt ? new Date(preview.wrappedUpAt) : new Date();
    return wrappedUpLine(when, preview.inviter.firstName, new Date());
  });

  /** Where "Start a Popkin" goes: naming one, or signing up first. */
  protected readonly startLink = computed(() => (this.signedIn() ? '/new' : '/sign-up'));
  protected readonly profileUrl = `/i/${this.code}/profile`;

  constructor() {
    void this.session.ensureLoaded();
    this.load();
  }

  protected load(): void {
    this.problem.set(null);
    this.preview.set(null);
    this.invites.getPreview(this.code).subscribe({
      next: (preview) => {
        if (preview.viewer.isMember && preview.viewer.popkinId) {
          void this.router.navigate(['/p', preview.viewer.popkinId], { replaceUrl: true });
          return;
        }
        this.state.setPreview(this.code, preview);
        this.preview.set(preview);
      },
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        if (problem.status === 404) this.problem.set({ kind: 'not-found' });
        else if (problem.status === 429)
          this.problem.set({ kind: 'limited', text: tryAgainIn(problem.retryAfterSeconds) });
        else this.problem.set({ kind: 'failed' });
      },
    });
  }
}

function toStackAvatar(avatar: AvatarView): StackAvatar {
  return { initials: avatar.initials, accent: accentOf(avatar.accent), photo: avatar.photoUrl };
}
