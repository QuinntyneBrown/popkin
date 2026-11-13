import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  INVITES_API,
  InviteMembersView,
  InvitePreviewView,
  JoinInviteState,
  PHOTO_ACCEPT,
  SessionStore,
  accentOf,
  andMore,
  photoProblem,
  photoProblemText,
  toApiProblem,
} from 'api';
import {
  Alert,
  Button,
  ListedPerson,
  PeopleList,
  PhotoPicker,
  PopkinTile,
  Screen,
  SplitAside,
  TextField,
  TopBar,
} from 'components';

/** The profile step of joining: a name and, if the person likes, a photo (L2-013). */
@Component({
  selector: 'pk-your-profile-page',
  imports: [
    Alert,
    Button,
    PeopleList,
    PhotoPicker,
    PopkinTile,
    ReactiveFormsModule,
    Screen,
    SplitAside,
    TextField,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './your-profile.page.html',
})
export class YourProfilePage {
  private readonly invites = inject(INVITES_API);
  private readonly state = inject(JoinInviteState);
  private readonly router = inject(Router);

  protected readonly code = inject(ActivatedRoute).snapshot.paramMap.get('code') ?? '';
  protected readonly inviteUrl = `/i/${this.code}`;
  protected readonly accept = PHOTO_ACCEPT;

  protected readonly preview = signal<InvitePreviewView | null>(this.state.preview(this.code));
  protected readonly members = signal<InviteMembersView | null>(null);
  protected readonly accent = computed(() => accentOf(this.preview()?.colour ?? 'Coral'));
  protected readonly people = computed<ListedPerson[]>(() =>
    (this.members()?.members ?? []).map((member) => ({
      name: member.displayName,
      initials: member.avatar.initials,
      accent: accentOf(member.avatar.accent),
      photo: member.avatar.photoUrl,
    })),
  );
  protected readonly more = computed(() => andMore(this.members()?.othersCount ?? 0));

  /** Prefilled with the account name (L2-013 AC1). */
  protected readonly name = new FormControl(inject(SessionStore).session()?.name ?? '', {
    nonNullable: true,
  });
  private readonly typed = toSignal(this.name.valueChanges, { initialValue: this.name.value });
  protected readonly ready = computed(() => this.typed().trim().length > 0);
  protected readonly initial = computed(() => {
    const first = Array.from(this.typed().trim())[0];
    return first ? first.toUpperCase() : '?';
  });

  protected readonly photo = signal<File | null>(null);
  protected readonly photoUrl = signal<string | null>(null);
  protected readonly photoError = signal<string | undefined>(undefined);
  protected readonly status = signal<'idle' | 'joining' | 'failed'>('idle');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.releasePhoto());
    if (this.preview()) this.loadMembers();
    else this.loadPreview();
  }

  protected pick(file: File): void {
    const problem = photoProblem(file);
    if (problem) {
      this.photoError.set(photoProblemText(problem));
      return;
    }
    this.releasePhoto();
    this.photo.set(file);
    this.photoUrl.set(URL.createObjectURL(file));
    this.photoError.set(undefined);
  }

  protected join(event?: Event): void {
    event?.preventDefault();
    if (!this.ready() || this.status() === 'joining') return;
    this.status.set('joining');
    this.invites.join(this.code, this.name.value.trim(), this.photo()).subscribe({
      next: (joined) => {
        this.state.setJoined(this.code, joined);
        void this.router.navigateByUrl(`${this.inviteUrl}/welcome`);
      },
      error: (error: unknown) => {
        const problem = toApiProblem(error);
        if (problem.status === 404 || problem.code === 'popkin_wrapped_up') {
          // The invite screen says what happened to the Popkin.
          void this.router.navigateByUrl(this.inviteUrl);
          return;
        }
        if (problem.code === 'photo_type_not_allowed' || problem.code === 'photo_too_large') {
          this.photoError.set(
            photoProblemText(problem.code === 'photo_too_large' ? 'size' : 'type'),
          );
          this.status.set('idle');
          return;
        }
        this.status.set('failed');
      },
    });
  }

  private loadPreview(): void {
    this.invites.getPreview(this.code).subscribe({
      next: (preview) => {
        if (preview.viewer.isMember && preview.viewer.popkinId) {
          void this.router.navigate(['/p', preview.viewer.popkinId], { replaceUrl: true });
        } else if (preview.state !== 'Open') {
          void this.router.navigateByUrl(this.inviteUrl, { replaceUrl: true });
        } else {
          this.state.setPreview(this.code, preview);
          this.preview.set(preview);
          this.loadMembers();
        }
      },
      // The invite screen says why it cannot be opened, and offers the ways on.
      error: () => void this.router.navigateByUrl(this.inviteUrl, { replaceUrl: true }),
    });
  }

  /** Who is already in is a picture beside the step; joining does not wait for it. */
  private loadMembers(): void {
    this.invites.getMembers(this.code).subscribe({
      next: (members) => this.members.set(members),
      error: () => this.members.set(null),
    });
  }

  private releasePhoto(): void {
    const url = this.photoUrl();
    if (url) URL.revokeObjectURL(url);
  }
}
