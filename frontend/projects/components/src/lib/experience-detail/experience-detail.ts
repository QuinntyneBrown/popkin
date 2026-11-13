import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';
import { Skeleton } from '../skeleton/skeleton';

/**
 * An experience (docs/design-system/components/card.html, `detail`): the body of the screen of
 * one experience, inside a `flush` body of the app screen. Its lead is the picture with Back
 * over it (and, for its sharer and the Host, its `actions` at the other end, L2-040 AC6), or
 * the Popkin's `emoji` on its colour where there is no picture, and under it the
 * kind and when, the title (the screen's `h1`), who shared it and the place. The rest is the
 * cards (the score, the member's rating) and what people said.
 *
 * One column on a phone; from 768 px the picture is a band and the cards sit side by side; from
 * 1024 px the lead is beside the rest and stays in view while the rest scrolls (L2-058 AC11).
 *
 * While `loading` the picture and the words are a skeleton, with a status line for assistive
 * technology (L2-056 AC1), and the rest is empty.
 *
 * Slots: `[slot=cards]` holds the cards (`pk-score-card`, `pk-rating-panel`); the default slot
 * comes under them (`pk-comments`). Set `data-accent` on an ancestor.
 */
@Component({
  selector: 'div[pk-experience-detail]',
  imports: [Avatar, Icon, IconButton, RouterLink, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-detail.html',
  styleUrl: './experience-detail.scss',
  host: { class: 'detail' },
})
export class ExperienceDetail {
  /** The route Back leads to: Experiences. */
  readonly back = input.required<string | readonly unknown[]>();
  readonly backLabel = input('Back');
  /** The skeleton of the experience, in place of it. */
  readonly loading = input(false);
  /** The screen's `h1` while there is no title to be it; visually hidden. */
  readonly heading = input('Experience');
  /** What the status line says while it loads. */
  readonly loadingText = input('Loading this experience…');

  /** The experience's picture. Decoration: the title names the experience. */
  readonly photo = input<string | null>(null);
  /** The Popkin's emoji, shown on its colour when there is no picture. */
  readonly emoji = input<string>();
  /** The kind, in words: "Something we did". */
  readonly kind = input('');
  /** When it was, as the member wrote it: "Sat morning". None without it. */
  readonly when = input<string>();
  readonly title = input('');
  /** Who shared it, in words: "Shared by Mara". */
  readonly by = input('');
  readonly avatar = input<PersonAvatar | null>(null);
  /** Where it was: "Heron Point, Lake Ossia". None without it. */
  readonly place = input<string>();

  /**
   * The name of the button that opens the experience's actions: "Experience actions". Without
   * it the button is absent, as it is for a member who neither shared it nor hosts the Popkin.
   */
  readonly actions = input<string>();
  /** The actions button was chosen. */
  readonly actionsOpened = output<void>();

  /** The line above the title: "Something we did · Sat morning". */
  protected readonly kicker = computed(() =>
    [this.kind(), this.when()].filter(Boolean).join(' · '),
  );
}
