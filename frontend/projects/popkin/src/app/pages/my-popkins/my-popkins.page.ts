import { Dialog } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MyPopkinsStore, SessionStore, accentOf, accountLabel } from 'api';
import {
  Avatar,
  Banner,
  Button,
  EmptyState,
  Fab,
  GridPopkin,
  Icon,
  IconButton,
  Logo,
  PageScreen,
  PopkinGrid,
  PopkinSkeleton,
  TopBar,
  WrappedList,
  WrappedPopkin,
} from 'components';
import { ScanToJoinDialog } from '../../dialogs/scan-to-join/scan-to-join.dialog';

/**
 * My Popkins (L2-017, L2-018): the Popkins a person belongs to, the active ones as cards and
 * the wrapped-up ones below, with the ways to start one and to join one.
 */
@Component({
  selector: 'pk-my-popkins-page',
  imports: [
    Avatar,
    Banner,
    Button,
    EmptyState,
    Fab,
    Icon,
    IconButton,
    Logo,
    PageScreen,
    PopkinGrid,
    PopkinSkeleton,
    RouterLink,
    TopBar,
    WrappedList,
  ],
  providers: [MyPopkinsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './my-popkins.page.html',
})
export class MyPopkinsPage {
  protected readonly store = inject(MyPopkinsStore);
  private readonly session = inject(SessionStore).session;
  private readonly dialog = inject(Dialog);

  protected readonly name = computed(() => this.session()?.name ?? '');
  protected readonly photo = computed(() => this.session()?.photoUrl ?? null);
  protected readonly accountLabel = computed(() => accountLabel(this.name()));

  /** "New Popkin" shows with the list and while it loads; the empty state has its own way. */
  protected readonly canStart = computed(
    () => this.store.state() === 'ready' || this.store.state() === 'loading',
  );

  protected readonly active = computed<GridPopkin[]>(() =>
    this.store.cards().map((card) => ({
      link: ['/p', card.id],
      accent: card.accent,
      emoji: card.emoji,
      name: card.name,
      last: card.latest,
      avatars: card.avatars.map((avatar) => ({
        initials: avatar.initials,
        accent: accentOf(avatar.accent),
        photo: avatar.photoUrl,
      })),
      more: card.more,
      members: card.members,
      time: card.timeLeft,
      ongoing: card.ongoing,
      unread: card.unread,
      unreadLabel: card.unreadLabel,
    })),
  );

  protected readonly wrapped = computed<WrappedPopkin[]>(() =>
    this.store.wrapped().map((row) => ({
      link: ['/p', row.id, 'recap'],
      accent: row.accent,
      emoji: row.emoji,
      name: row.name,
      summary: row.line,
    })),
  );

  constructor() {
    this.store.open();
  }

  /** Opens "Scan to join" (L2-015 AC1). */
  protected scan(): void {
    this.dialog.open(ScanToJoinDialog, {
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
  }
}
