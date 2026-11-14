import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { IconButton } from '../icon-button/icon-button';

/** The message a reply answers, as the reply bar shows it. */
export interface ComposerReply {
  firstName: string;
  snippet: string;
}

/**
 * Composer (docs/design-system/components/composer.html): the message bar at the foot of a
 * thread, a pill field and a coral Send. Enter sends and Shift+Enter starts a new line; the
 * field grows with its text to about five lines, then scrolls (L2-021 AC5 to AC7). Send is
 * disabled while there is nothing to send. Near the limit a count shows how much room is left.
 *
 * `send` carries the trimmed text. The composer does not empty itself: the consumer sets `value`
 * once the message is taken. `[slot=start]` (before the field) and `[slot=tools]` (inside it,
 * after the text) are for the buttons of later features.
 *
 * With a `reply` the bar above the field says "Replying to {first name}" over one line of the
 * message, with "Cancel reply" (L2-025 AC1); the focus moves to the field when it shows, and
 * Escape in the field or "Cancel reply" emits `cancelReply`, the focus staying in the field.
 *
 * With `closed` it is the closed form: no field and no Send, only the line that says why
 * nobody can post (L2-045 AC1).
 */
@Component({
  selector: 'div[pk-composer]',
  imports: [IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './composer.html',
  styleUrl: './composer.scss',
  host: { class: 'composer' },
})
export class Composer {
  readonly value = model('');
  /** The accessible name of the field and its placeholder: "Message everyone". */
  readonly label = input('');
  /** The longest text the field takes. */
  readonly maxLength = input(2000);
  /** The length from which the count shows. */
  readonly countFrom = input(1800);
  readonly disabled = input(false);
  /** Why nobody can post: "This Popkin has wrapped up. Messages stay, but nobody can post new
   * ones." It stands in place of the field. */
  readonly closed = input<string>();
  /** The message being replied to: its sender's first name and one line of its text. */
  readonly reply = input<ComposerReply | null>(null);

  /** The trimmed text to send. */
  readonly send = output<string>();
  /** "Cancel reply", or Escape in the field while replying. */
  readonly cancelReply = output<void>();

  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  protected readonly canSend = computed(() => !this.disabled() && this.value().trim() !== '');

  /** "1,950 / 2,000" from `countFrom` characters on; empty before. */
  protected readonly count = computed(() => {
    const length = this.value().length;
    if (length < this.countFrom()) return '';
    return `${length.toLocaleString('en-US')} / ${this.maxLength().toLocaleString('en-US')}`;
  });

  constructor() {
    // The field is as tall as its text; its stylesheet stops it at five lines.
    afterRenderEffect(() => {
      this.value();
      const field = this.field()?.nativeElement;
      if (!field) return;
      field.style.height = 'auto';
      // One line keeps its own height; more lines get theirs, rounded up so nothing scrolls.
      if (field.scrollHeight > field.clientHeight) {
        field.style.height = `${field.scrollHeight + 1}px`;
      }
    });
    // A reply that shows puts the focus where the answer is written.
    afterRenderEffect(() => {
      if (this.reply()) this.field()?.nativeElement.focus();
    });
  }

  /** Moves focus to the field. */
  focus(): void {
    this.field()?.nativeElement.focus();
  }

  /**
   * Enter sends; Shift+Enter, and Enter while an input method is composing, do not. Escape
   * cancels a reply.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.reply()) {
      event.preventDefault();
      this.cancelReply.emit();
      return;
    }
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
      return;
    }
    event.preventDefault();
    this.submit();
  }

  /** "Cancel reply": the button goes with the bar, so the focus stays in the field. */
  protected cancel(): void {
    this.focus();
    this.cancelReply.emit();
  }

  protected submit(event?: Event): void {
    event?.preventDefault();
    if (!this.canSend()) return;
    this.send.emit(this.value().trim());
  }
}
