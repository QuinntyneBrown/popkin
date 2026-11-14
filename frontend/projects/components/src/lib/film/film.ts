import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../icon/icon';

/** A named time in the film that the visitor can jump to. */
export interface FilmChapter {
  /** Seconds into the film. */
  at: number;
  /** The time as it is shown: "0:16". */
  time: string;
  title: string;
}

/**
 * Film (docs/design-system/components/film.html): the pitch film of the marketing site
 * (L2-080). Until the visitor presses play or chooses a chapter it shows the still as a button
 * over a film that is not fetched (`preload="none"`); then the film plays with the browser's
 * own controls and takes the focus. The chapter chosen is `aria-current` while the film plays.
 *
 * The film's narration must be in its picture: the player adds no caption track (AC5).
 */
@Component({
  selector: 'pk-film',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './film.html',
  styleUrl: './film.scss',
  host: { class: 'film' },
})
export class Film {
  readonly src = input.required<string>();
  readonly still = input.required<string>();
  /** The film's name for assistive technology: "Meet Popkin". */
  readonly label = input.required<string>();
  /** The play button's name: "Play the Popkin film". */
  readonly playLabel = input.required<string>();
  /** The length shown on the still: "1:38". */
  readonly length = input.required<string>();
  readonly chapters = input<readonly FilmChapter[]>([]);

  protected readonly playing = signal(false);
  protected readonly current = signal(0);
  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  /** Plays from a chapter; the play button starts at the beginning. */
  protected play(index: number | null = null): void {
    this.current.set(index ?? 0);
    this.playing.set(true);
    const video = this.video().nativeElement;
    video.currentTime = index === null ? 0 : this.chapters()[index].at;
    // A browser may refuse to play; the controls are there for the visitor to press.
    video.play().catch(() => undefined);
    video.focus({ preventScroll: true });
  }
}
