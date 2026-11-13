import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { ExperienceCommentView, ExperienceDetailView } from '../../models/experiences';
import { AvatarView } from '../../models/invite';
import { accentOf } from '../../models/popkin';
import {
  ScoreBar,
  averageText,
  intro,
  ratingsText,
  scoreBars,
  starsLabel,
} from './experience-text';
import { EXPERIENCES_API } from './experiences-api';

/** One experience as its page draws it (L2-038). */
export interface ExperiencePage {
  /** "Something we did · Sat morning". */
  intro: string;
  title: string;
  pictureUrl: string | null;
  emoji: string;
  accent: string;
  /** "Shared by Mara". */
  sharedBy: string;
  avatar: AvatarView;
  place: string | null;
  /** The group's score; null for something the group wants to do, which is not rated. */
  score: {
    /** "4.8"; empty when nobody has rated. */
    value: string;
    /** How many of the five stars are filled. */
    stars: number;
    /** "4.8 out of 5". */
    label: string;
    /** "11 ratings". */
    count: string;
    bars: ScoreBar[];
  } | null;
  /** The member's own rating; null where rating is not offered. */
  panel: {
    heading: string;
    /** 0 before they rate. */
    stars: number;
    /** "Add a comment" or "Edit your comment" once they have rated; null before. */
    comment: string | null;
  } | null;
  comments: {
    id: string;
    name: string;
    avatar: AvatarView;
    stars: number;
    rated: string;
    text: string;
  }[];
  canEdit: boolean;
  canDelete: boolean;
}

/**
 * One experience: its score, the member's rating and what people said
 * (docs/detailed-designs/experiences/view-experience, rate-experience,
 * comment-on-experience). One per screen.
 */
@Injectable()
export class ExperienceStore {
  private readonly api = inject(EXPERIENCES_API);

  private popkinId = '';
  private experienceId = '';
  private reading?: Subscription;
  private rating?: Subscription;
  private readonly experience = signal<ExperienceDetailView | null>(null);
  /** The stars just chosen, shown before the API has answered (L2-039 AC2). */
  private readonly chosen = signal<number | null>(null);
  private readonly failures = new Subject<number>();

  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  /** A rating did not save: the stars that were chosen, to try again with (L2-039 AC5). */
  readonly rateFailed$ = this.failures.asObservable();

  readonly view = computed<ExperiencePage | null>(() => {
    const experience = this.state() === 'ready' ? this.experience() : null;
    if (!experience) return null;
    const mine = experience.myRating;
    const score = experience.score;
    return {
      intro: intro(experience),
      title: experience.title,
      pictureUrl: experience.pictureUrl,
      emoji: experience.emoji,
      accent: accentOf(experience.colour),
      sharedBy: `Shared by ${experience.sharedBy.firstName}`,
      avatar: experience.sharedBy.avatar,
      place: experience.place,
      score:
        experience.kind === 'Want'
          ? null
          : {
              value: averageText(score.average),
              stars: score.average ?? 0,
              label: starsLabel(score.average),
              count: ratingsText(score.ratingCount),
              bars: scoreBars(score.counts),
            },
      panel: experience.canRate
        ? {
            heading: mine ? 'Thanks! Your rating' : 'How was it for you?',
            stars: this.chosen() ?? mine?.stars ?? 0,
            comment: mine ? (mine.comment ? 'Edit your comment' : 'Add a comment') : null,
          }
        : null,
      comments: experience.comments.map((comment) => ({
        id: comment.membershipId,
        name: comment.firstName,
        avatar: comment.avatar,
        stars: comment.stars,
        rated: `Rated ${comment.stars}`,
        text: comment.text,
      })),
      canEdit: experience.canEdit,
      canDelete: experience.canDelete,
    };
  });

  /** What the Add a comment dialog opens with (L2-041 AC1, AC4); null before a rating. */
  readonly commentDraft = computed(() => {
    const experience = this.experience();
    const mine = experience?.myRating;
    return experience && mine
      ? { title: experience.title, stars: mine.stars, text: mine.comment ?? '' }
      : null;
  });

  /** The experience as the API gave it: what the dialog that edits it starts from. */
  readonly source = this.experience.asReadonly();

  open(popkinId: string, experienceId: string): void {
    this.popkinId = popkinId;
    this.experienceId = experienceId;
    this.read(true);
  }

  retry(): void {
    this.read(true);
  }

  /**
   * The member chose a star. It shows at once; the score and the thanks follow the API's
   * answer, and a failure puts the stars back (L2-039 AC2, AC3, AC5). A later choice
   * replaces one still on its way.
   */
  rate(stars: number): void {
    if (!this.experience()?.canRate) return;
    this.rating?.unsubscribe();
    this.chosen.set(stars);
    this.rating = this.api.rate(this.popkinId, this.experienceId, stars).subscribe({
      next: (result) => {
        const commented = !!this.experience()?.myRating?.comment;
        this.experience.update(
          (experience) =>
            experience && {
              ...experience,
              score: result.score,
              myRating: { stars: result.stars, comment: experience.myRating?.comment ?? null },
            },
        );
        this.chosen.set(null);
        // Their comment under "What people said" carries their stars too.
        if (commented) this.read(false);
      },
      error: () => {
        this.chosen.set(null);
        this.failures.next(stars);
      },
    });
  }

  /** The member's comment was saved: it goes first, in place of any they had (L2-041 AC3). */
  commented(comment: ExperienceCommentView): void {
    this.experience.update(
      (experience) =>
        experience && {
          ...experience,
          myRating: { stars: comment.stars, comment: comment.text },
          comments: [
            comment,
            ...experience.comments.filter((other) => other.membershipId !== comment.membershipId),
          ],
        },
    );
  }

  private read(showLoading: boolean): void {
    this.reading?.unsubscribe();
    if (showLoading) this.state.set('loading');
    this.reading = this.api.get(this.popkinId, this.experienceId).subscribe({
      next: (experience) => {
        this.experience.set(experience);
        this.state.set('ready');
      },
      error: (error: unknown) => {
        if (!showLoading) return;
        this.state.set(
          error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
        );
      },
    });
  }
}
