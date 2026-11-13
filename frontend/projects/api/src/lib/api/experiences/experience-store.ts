import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { ExperienceCommentView, ExperienceDetailView } from '../../models/experiences';
import { accentOf } from '../../models/popkin';
import {
  ScoreBar,
  averageText,
  kindLabel,
  ratingsText,
  scoreBars,
  starsLabel,
  Face,
  faceOf,
} from './experience-text';
import { EXPERIENCES_API } from './experiences-api';

/** One experience as its page draws it (L2-038). */
export interface ExperiencePage {
  /** "Something we did". */
  kind: string;
  /** "Sat morning"; undefined when the sharer gave none. */
  when: string | undefined;
  title: string;
  pictureUrl: string | null;
  emoji: string;
  accent: string;
  /** "Shared by Mara". */
  sharedBy: string;
  avatar: Face;
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
    avatar: Face;
    stars: number;
    rated: string;
    text: string;
  }[];
  /** Who is keen on an idea, in the rating panel's place (L2-042); null for anything else. */
  keen: {
    /** "7 keen". */
    count: string;
    /** The first four who are keen, the earliest first. */
    faces: { initials: string; accent: string; photo: string | null }[];
    /** How many more are keen than are shown. */
    more: number;
    /** Whether the member is keen; null where they cannot say so. */
    pressed: boolean | null;
    /** "I’m keen", or "You’re keen" while pressed. */
    label: string;
    /** A change of keen is on its way. */
    busy: boolean;
  } | null;
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
  private keening?: Subscription;
  private readonly experience = signal<ExperienceDetailView | null>(null);
  /** The stars just chosen, shown before the API has answered (L2-039 AC2). */
  private readonly chosen = signal<number | null>(null);
  private readonly failures = new Subject<number>();
  private readonly keenFailures = new Subject<void>();
  /** A change of keen is on its way (L2-042). */
  private readonly keenBusy = signal(false);

  readonly state = signal<'loading' | 'ready' | 'error' | 'not-found'>('loading');
  /** A rating did not save: the stars that were chosen, to try again with (L2-039 AC5). */
  readonly rateFailed$ = this.failures.asObservable();
  /** A change of keen did not save; the panel is as it was. */
  readonly keenFailed$ = this.keenFailures.asObservable();

  readonly view = computed<ExperiencePage | null>(() => {
    const experience = this.state() === 'ready' ? this.experience() : null;
    if (!experience) return null;
    const mine = experience.myRating;
    const score = experience.score;
    return {
      kind: kindLabel(experience.kind),
      when: experience.when?.trim() || undefined,
      title: experience.title,
      pictureUrl: experience.pictureUrl,
      emoji: experience.emoji,
      accent: accentOf(experience.colour),
      sharedBy: `Shared by ${experience.sharedBy.firstName}`,
      avatar: faceOf(experience.sharedBy.avatar),
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
        avatar: faceOf(comment.avatar),
        stars: comment.stars,
        rated: `Rated ${comment.stars}`,
        text: comment.text,
      })),
      keen: experience.keen && {
        count: `${experience.keen.count} keen`,
        faces: experience.keen.members.map((member) => {
          const shown = faceOf(member.avatar);
          return { initials: shown.initials, accent: shown.accent, photo: shown.photoUrl };
        }),
        more: Math.max(0, experience.keen.count - experience.keen.members.length),
        pressed: experience.canKeen ? experience.keen.mine : null,
        label: experience.keen.mine ? 'You’re keen' : 'I’m keen',
        busy: this.keenBusy(),
      },
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
    // A change of keen still on its way belongs to the experience that was open.
    this.keening?.unsubscribe();
    this.keenBusy.set(false);
    this.popkinId = popkinId;
    this.experienceId = experienceId;
    this.read(true);
  }

  retry(): void {
    this.read(true);
  }

  /** Reads the experience again after it was edited; what is shown stays until it answers. */
  refresh(): void {
    this.read(false);
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

  /**
   * "I’m keen" or "You’re keen" was pressed: the member says they are keen, or takes it back
   * (L2-042 AC2, AC3). The toggle is busy until the answer, which the panel then shows; a
   * failure leaves it as it was and says so.
   */
  toggleKeen(): void {
    const experience = this.experience();
    if (!experience?.canKeen || !experience.keen || this.keenBusy()) return;
    this.keenBusy.set(true);
    this.keening = this.api
      .setKeen(this.popkinId, this.experienceId, !experience.keen.mine)
      .subscribe({
        next: (keen) => {
          this.experience.update(
            (current) => current && { ...current, keen, keenCount: keen.count },
          );
          this.keenBusy.set(false);
        },
        error: () => {
          this.keenBusy.set(false);
          this.keenFailures.next();
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
