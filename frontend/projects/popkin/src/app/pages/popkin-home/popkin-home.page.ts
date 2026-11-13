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
import { RouterLink } from '@angular/router';
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
import { InviteData, InviteDialog } from '../../dialogs/invite/invite.dialog';

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

  protected retry(section: HomeSection): void {
    this.store.retrySection(section);
  }
}
