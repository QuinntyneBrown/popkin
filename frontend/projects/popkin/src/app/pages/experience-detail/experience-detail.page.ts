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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import {
  ErrorScreens,
  ExperienceCardView,
  ExperienceCommentView,
  ExperienceStore,
  PopkinFrame,
  UnreadTracker,
} from 'api';
import {
  AppScreen,
  Button,
  Comment,
  Comments,
  EmptyState,
  ExperienceDetail,
  Icon,
  KeenPanel,
  PopkinNav,
  RatingPanel,
  ScoreCard,
  Screen,
  TopBar,
} from 'components';
import { AddCommentData, AddCommentDialog } from '../../dialogs/add-comment/add-comment.dialog';
import {
  DeleteExperienceData,
  DeleteExperienceDialog,
} from '../../dialogs/delete-experience/delete-experience.dialog';
import {
  ExperienceAction,
  ExperienceActionsData,
  ExperienceActionsDialog,
} from '../../dialogs/experience-actions/experience-actions.dialog';
import {
  ShareExperienceData,
  ShareExperienceDialog,
} from '../../dialogs/share-experience/share-experience.dialog';
import { Toaster } from '../../toasts/toaster';

/**
 * One experience (L2-038): what it was, the group's score, the member's own rating
 * (L2-039) and what people said (L2-041); for an idea, who is keen (L2-042).
 */
@Component({
  selector: 'pk-experience-detail-page',
  imports: [
    AppScreen,
    Button,
    Comment,
    Comments,
    EmptyState,
    ExperienceDetail,
    Icon,
    KeenPanel,
    PopkinNav,
    RatingPanel,
    RouterLink,
    ScoreCard,
    Screen,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-detail.page.html',
})
export class ExperienceDetailPage {
  /** The route's `:popkinId` and `:experienceId`. */
  readonly popkinId = input.required<string>();
  readonly experienceId = input.required<string>();

  protected readonly store = inject(ExperienceStore);
  protected readonly frame = inject(PopkinFrame);
  private readonly unread = inject(UnreadTracker);
  private readonly errors = inject(ErrorScreens);
  private readonly dialog = inject(Dialog);
  private readonly toaster = inject(Toaster);
  private readonly router = inject(Router);

  protected readonly back = computed(() => `/p/${this.popkinId()}/experiences`);
  protected readonly unreadCount = computed(() => this.unread.forPopkin(this.popkinId()));

  constructor() {
    effect(() => {
      const popkinId = this.popkinId();
      const experienceId = this.experienceId();
      untracked(() => {
        this.frame.open(popkinId);
        this.store.open(popkinId, experienceId);
      });
    });
    // L2-051 AC1: an experience that is not there, or not this person's to see, is not found.
    effect(() => {
      if (this.store.state() === 'not-found') untracked(() => this.errors.showNotFound());
    });
    // L2-039 AC5: the stars are back as they were; the toast says so and offers the same again.
    this.store.rateFailed$
      .pipe(takeUntilDestroyed())
      .subscribe((stars) =>
        this.toaster.show(
          'danger',
          'Your rating didn’t save',
          'Your stars are back to how they were.',
          { label: 'Try again', run: () => this.store.rate(stars) },
        ),
      );
    // L2-042: the keen toggle is as it was; the toast says so and offers the same again.
    this.store.keenFailed$.pipe(takeUntilDestroyed()).subscribe(() =>
      this.toaster.show('danger', 'Your keen didn’t save', 'It’s back to how it was.', {
        label: 'Try again',
        run: () => this.store.toggleKeen(),
      }),
    );
    // L2-042 AC4: it is still an idea; the toast says so and offers the same again.
    this.store.doneFailed$.pipe(takeUntilDestroyed()).subscribe(() =>
      this.toaster.show('danger', 'That didn’t save', 'It’s still something you want to do.', {
        label: 'Try again',
        run: () => this.store.markDone(),
      }),
    );
  }

  /** "Add a comment" and "Edit your comment" (L2-041 AC1, AC4). */
  protected comment(): void {
    const draft = this.store.commentDraft();
    if (!draft) return;
    const opened = this.dialog.open<ExperienceCommentView, AddCommentData>(AddCommentDialog, {
      data: {
        popkinId: this.popkinId(),
        experienceId: this.experienceId(),
        accent: this.frame.accent(),
        ...draft,
      },
      ariaLabelledBy: 'dlg-title',
      autoFocus: 'textarea',
      // pk-dialog draws its own backdrop, as the mocks do.
      hasBackdrop: false,
      ariaModal: true,
    });
    opened.closed.subscribe((comment) => {
      if (comment) this.store.commented(comment);
    });
  }

  /** "Experience actions" (L2-040 AC6): what its sharer, or the Host, may do with it. */
  protected actions(): void {
    const experience = this.store.source();
    if (!experience) return;
    const opened = this.dialog.open<ExperienceAction, ExperienceActionsData>(
      ExperienceActionsDialog,
      {
        data: {
          accent: this.frame.accent(),
          title: experience.title,
          canEdit: experience.canEdit,
          canDelete: experience.canDelete,
        },
        ...MODAL,
      },
    );
    opened.closed.subscribe((action) => {
      if (action === 'edit') this.edit();
      if (action === 'delete') this.delete();
    });
  }

  private edit(): void {
    const experience = this.store.source();
    if (!experience) return;
    const opened = this.dialog.open<ExperienceCardView, ShareExperienceData>(
      ShareExperienceDialog,
      {
        data: { popkinId: this.popkinId(), accent: this.frame.accent(), editing: experience },
        autoFocus: '#etitle',
        ...MODAL,
      },
    );
    opened.closed.subscribe((changed) => {
      if (changed) this.store.refresh();
    });
  }

  private delete(): void {
    const title = this.store.source()?.title ?? '';
    const opened = this.dialog.open<boolean, DeleteExperienceData>(DeleteExperienceDialog, {
      data: {
        popkinId: this.popkinId(),
        experienceId: this.experienceId(),
        accent: this.frame.accent(),
      },
      ariaDescribedBy: 'dlg-desc',
      ...MODAL,
    });
    opened.closed.subscribe((deleted) => {
      if (!deleted) return;
      this.toaster.show('success', 'Experience deleted', `${title} is gone from the list.`);
      void this.router.navigateByUrl(this.back());
    });
  }
}

/** pk-dialog draws its own backdrop, as the mocks do. */
const MODAL = { ariaLabelledBy: 'dlg-title', hasBackdrop: false, ariaModal: true } as const;
