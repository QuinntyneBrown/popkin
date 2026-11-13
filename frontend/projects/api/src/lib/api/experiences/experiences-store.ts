import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExperienceCardView, ExperienceFilter } from '../../models/experiences';
import { AvatarView } from '../../models/invite';
import { accentOf } from '../../models/popkin';
import { averageText, byline, kindLabel, nothingHere } from './experience-text';
import { EXPERIENCES_API } from './experiences-api';

/** An experience as its card draws it (L2-037). */
export interface ExperienceCard {
  id: string;
  /** "Something we did", "Restaurant" or "Want to do". */
  tag: string;
  title: string;
  /** Null shows the Popkin's emoji on its colour (L2-040 AC5). */
  pictureUrl: string | null;
  emoji: string;
  accent: string;
  avatar: AvatarView;
  /** "Mara · Sat morning". */
  by: string;
  /** "4.8" and "(11)"; null for an idea and for something nobody has rated (L2-037 AC2). */
  rating: { average: string; count: string; label: string } | null;
  /** "7 keen" on an idea (L2-037 AC3); null otherwise. */
  keen: string | null;
}

/**
 * The Experiences of one Popkin under one filter (docs/detailed-designs/experiences/
 * list-experiences). One per screen.
 */
@Injectable()
export class ExperiencesStore {
  private readonly api = inject(EXPERIENCES_API);

  private popkinId = '';
  private reading?: Subscription;
  private readonly items = signal<ExperienceCardView[]>([]);

  readonly state = signal<'loading' | 'ready' | 'empty' | 'no-results' | 'error' | 'not-found'>(
    'loading',
  );
  readonly filter = signal<ExperienceFilter>('all');
  readonly cards = computed(() => this.items().map(toCard));
  /** What the screen says with nothing to list. */
  readonly nothing = computed(() => nothingHere(this.filter()));

  open(popkinId: string, filter: ExperienceFilter): void {
    this.popkinId = popkinId;
    this.filter.set(filter);
    this.read();
  }

  retry(): void {
    this.read();
  }

  /**
   * An experience the member just shared goes first (L2-040 AC4). False when the filter
   * leaves it out: the screen then shows "All".
   */
  added(card: ExperienceCardView): boolean {
    const filter = this.filter();
    const shown = filter === 'all' || (filter === 'want') === (card.kind === 'Want');
    if (!shown) return false;
    this.items.update((items) => [card, ...items.filter((item) => item.id !== card.id)]);
    this.state.set('ready');
    return true;
  }

  private read(): void {
    // A filter chosen later cancels the read of an earlier one.
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.list(this.popkinId, this.filter()).subscribe({
      next: (items) => {
        this.items.set(items);
        this.state.set(items.length ? 'ready' : this.filter() === 'all' ? 'empty' : 'no-results');
      },
      error: (error: unknown) =>
        this.state.set(
          error instanceof HttpErrorResponse && error.status === 404 ? 'not-found' : 'error',
        ),
    });
  }
}

function toCard(card: ExperienceCardView): ExperienceCard {
  const idea = card.kind === 'Want';
  const average = averageText(card.average);
  return {
    id: card.id,
    tag: kindLabel(card.kind),
    title: card.title,
    pictureUrl: card.pictureUrl,
    emoji: card.emoji,
    accent: accentOf(card.colour),
    avatar: card.sharedBy.avatar,
    by: byline(card),
    rating:
      idea || card.average === null
        ? null
        : {
            average,
            count: `(${card.ratingCount})`,
            label: `Rated ${average} out of 5 by ${card.ratingCount}`,
          },
    keen: idea ? `${card.keenCount} keen` : null,
  };
}
