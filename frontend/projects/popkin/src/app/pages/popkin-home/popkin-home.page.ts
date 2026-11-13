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
import {
  AvatarView,
  CallBannerStore,
  ErrorScreens,
  HomeSection,
  PopkinHomeStore,
  UnreadTracker,
  accentOf,
  experiencesMeta,
  memberName,
  membersLabel,
  messageTime,
  photosMeta,
} from 'api';
import {
  Alert,
  AppScreen,
  Banner,
  Button,
  Card,
  ChatCard,
  EmptyState,
  ExperienceRow,
  Home,
  HomeHeader,
  Icon,
  MemberList,
  PhotoStrip,
  PopkinNav,
  Screen,
  Section,
  TopBar,
} from 'components';
import {
  PopkinSetting,
  PopkinSettingsData,
  PopkinSettingsDialog,
} from '../../dialogs/popkin-settings/popkin-settings.dialog';
import { InviteData, InviteDialog } from '../../dialogs/invite/invite.dialog';
import { LeavePopkinData, LeavePopkinDialog } from '../../dialogs/leave-popkin/leave-popkin.dialog';

/** How many of what a section holds the home lists; the layout shows fewer on a narrow screen. */
const MEMBERS_LISTED = 6;

const accent = (avatar: AvatarView) => accentOf(avatar.accent);

/**
 * The home of a Popkin (L2-019): who is in it, how long it has left, the latest chat, photos
 * and experiences, and the way to everything else. The header and each section are read on
 * their own, so one that fails leaves the others on screen.
 */
@Component({
  selector: 'pk-popkin-home-page',
  imports: [
    Banner,
    Alert,
    AppScreen,
    Button,
    Card,
    ChatCard,
    EmptyState,
    ExperienceRow,
    Home,
    HomeHeader,
    Icon,
    MemberList,
    PhotoStrip,
    PopkinNav,
    RouterLink,
    Screen,
    Section,
    TopBar,
  ],
  providers: [PopkinHomeStore, CallBannerStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-home.page.html',
})
export class PopkinHomePage {
  /** The route's `:popkinId`. */
  readonly popkinId = input.required<string>();

  protected readonly store = inject(PopkinHomeStore);
  /** The group call under way, if there is one (L2-029 AC2). */
  protected readonly call = inject(CallBannerStore).banner;
  private readonly calls = inject(CallBannerStore);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);
  private readonly router = inject(Router);

  protected readonly popkin = this.store.popkin;
  protected readonly accent = computed(() => {
    const popkin = this.popkin();
    return popkin ? accentOf(popkin.colour) : 'coral';
  });
  protected readonly avatars = computed(() =>
    (this.popkin()?.avatars ?? []).map((avatar) => ({
      initials: avatar.initials,
      accent: accent(avatar),
      photo: avatar.photoUrl,
    })),
  );
  protected readonly more = computed(() => {
    const popkin = this.popkin();
    return popkin ? Math.max(0, popkin.memberCount - popkin.avatars.length) : 0;
  });
  protected readonly membersLabel = computed(() => membersLabel(this.popkin()?.memberCount ?? 0));
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  protected readonly latest = computed(() =>
    (this.store.chat().data?.messages ?? []).map((message) => ({
      name: message.author.firstName,
      time: messageTime(new Date(message.sentAt)),
      text: message.text,
      avatar: { ...message.author.avatar, accent: accent(message.author.avatar) },
    })),
  );
  protected readonly photosMeta = computed(() => {
    const photos = this.store.photos();
    return photos.state === 'ready' && photos.data ? photosMeta(photos.data.count) : undefined;
  });
  protected readonly thumbnails = computed(() =>
    (this.store.photos().data?.photos ?? []).map((photo) => ({
      link: ['/p', this.popkinId(), 'photos', photo.id],
      src: photo.thumbnailUrl,
      alt: photo.caption ?? 'Photo',
    })),
  );
  protected readonly experiencesMeta = computed(() => {
    const experiences = this.store.experiences();
    return experiences.state === 'ready' && experiences.data
      ? experiencesMeta(experiences.data.count)
      : undefined;
  });
  protected readonly topExperiences = computed(() =>
    (this.store.experiences().data?.top ?? []).map((experience) => ({
      link: ['/p', this.popkinId(), 'experiences', experience.id],
      title: experience.name,
      photo: experience.photoUrl,
      rating: experience.average.toFixed(1),
      ratings: experience.ratingCount === 1 ? '1 rating' : `${experience.ratingCount} ratings`,
    })),
  );
  protected readonly membersMeta = computed(() => {
    const popkin = this.popkin();
    return popkin ? String(popkin.memberCount) : undefined;
  });
  protected readonly listed = computed(() =>
    (this.store.members().data ?? []).slice(0, MEMBERS_LISTED).map((member) => ({
      name: memberName(member.displayName, member.isViewer),
      initials: member.avatar.initials,
      accent: accent(member.avatar),
      photo: member.avatar.photoUrl,
      role: member.role === 'Host' ? 'Host' : null,
    })),
  );

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      untracked(() => {
        this.store.open(popkinId);
        this.calls.open(popkinId);
      });
    });
    // L2-051 AC1: someone who is not a member cannot tell the Popkin exists.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
    // L2-045 AC5: a wrapped-up Popkin shows its recap first.
    effect(() => {
      if (this.store.state() !== 'wrapped-up') return;
      untracked(
        () => void this.router.navigate(['/p', this.popkinId(), 'recap'], { replaceUrl: true }),
      );
    });
  }

  /** "Bring someone in" (L2-011); closing it returns focus to what opened it. */
  protected invite(): void {
    this.dialog.open<void, InviteData>(InviteDialog, {
      data: { popkinId: this.popkinId(), accent: this.accent() },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
  }

  /**
   * The Host's banner offers to change how long the Popkin lasts (L2-044 AC2). Until that
   * dialog is built (journey 16), "Change" opens Popkin settings, where it will be.
   */
  protected readonly isHost = computed(() => this.popkin()?.viewerRole === 'Host');

  /** "Popkin settings" (L2-020): what a member, or the Host, may do with the Popkin. */
  protected settings(): void {
    const popkin = this.popkin();
    if (!popkin) return;
    const opened = this.dialog.open<PopkinSetting, PopkinSettingsData>(PopkinSettingsDialog, {
      data: { accent: this.accent(), name: popkin.name, host: popkin.viewerRole === 'Host' },
      ariaLabelledBy: 'dlg-title',
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((setting) => {
      if (setting === 'invite') this.invite();
      if (setting === 'wrap-up') void this.router.navigate(['/p', this.popkinId(), 'wrap-up']);
      if (setting === 'leave') this.leave(popkin.name);
    });
  }

  /** "Leave this Popkin" (L2-047): once the member has left, My Popkins opens without it. */
  private leave(name: string): void {
    const opened = this.dialog.open<boolean, LeavePopkinData>(LeavePopkinDialog, {
      data: { popkinId: this.popkinId(), name, accent: this.accent() },
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((left) => {
      if (left) void this.router.navigateByUrl('/popkins');
    });
  }

  protected retry(section: HomeSection): void {
    this.store.retrySection(section);
  }
}
