import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Avatar, PersonAvatar } from '../avatar/avatar';
import { Icon } from '../icon/icon';
import { Quote } from '../quote/quote';
import { Skeleton, SkeletonWidth } from '../skeleton/skeleton';

/**
 * How far a message of mine has got: `sending` is on its way, `waiting` is kept until the
 * connection is back, `failed` was not sent and can be tried again or deleted.
 */
export type MessageState = 'sent' | 'sending' | 'waiting' | 'failed';

/** A reaction chip under a message (L2-024 AC2, AC5). */
export interface MessageReaction {
  emoji: string;
  name: string;
  count: number;
  /** The member chose it: the chip is pressed, outlined and tinted. */
  mine: boolean;
  /** What assistive technology reads: "Heart, you reacted, 3". */
  label: string;
}

/** The quote a reply carries; a deleted message's reads "Message deleted" (L2-025). */
export interface MessageQuote {
  messageId: string;
  firstName: string;
  snippet: string;
  deleted: boolean;
}

/** How long a press is held before it opens the message's actions. */
const LONG_PRESS_MS = 500;
/** How far a finger may move during a press before it counts as a scroll, in px. */
const LONG_PRESS_SLOP = 10;

/**
 * Message (docs/design-system/components/message.html): one bubble. Theirs is on white beside
 * the sender's avatar, under their first name; mine is on the Popkin colour at the end of the
 * row, with its time. In a run of messages from one person only the first is the `lead` that
 * shows the name and the avatar (L2-021 AC2); the others keep the name for assistive technology.
 * The text is shown as text, with its line breaks (L2-052).
 *
 * An `actionable` message is an article in the tab order: Enter or Space on it, or a press of
 * the bubble held for 500 ms, emits `actions` (L2-024 AC1). Its `reactions` are chips under it
 * that toggle the member's own (`react`); `readOnly` draws them as words, not buttons (L2-045).
 * A reply's `quote` is a button that emits `goToQuote` with the quoted message's id (L2-025
 * AC3). After a jump the page sets `marked` for 2 seconds and calls `reveal()`.
 *
 * With `skeleton` it is the shape of a message that is loading and reads no other input but
 * `mine` and `width`.
 */
@Component({
  selector: 'div[pk-message]',
  imports: [Avatar, Icon, NgTemplateOutlet, Quote, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './message.html',
  styleUrl: './message.scss',
  host: {
    class: 'msg',
    '[class.msg--mine]': 'mine()',
    '[class.msg--marked]': 'marked()',
    '[attr.data-state]': 'skeleton() ? null : state()',
    '[attr.role]': 'actionable() ? "article" : null',
    '[attr.tabindex]': 'actionable() ? 0 : null',
    '(keydown)': 'onKeydown($event)',
  },
})
export class Message {
  readonly mine = input(false);
  /** The sender's first name. */
  readonly name = input('');
  readonly avatar = input<PersonAvatar>();
  /** The first message of a run: it shows the name and the avatar. */
  readonly lead = input(true);
  readonly text = input('');
  /** The time it was sent, in words, shown under my own messages. */
  readonly time = input('');
  readonly state = input<MessageState>('sent');
  /** Draws the loading shape instead of a message. */
  readonly skeleton = input(false);
  /** The width of the loading bubble, in percent of the row. */
  readonly width = input<SkeletonWidth>(60);
  /** The message's id, for a page that finds the message to `reveal()` it. */
  readonly messageId = input<string>();
  /** The message has actions: it takes focus and opens them (L2-024 AC1). */
  readonly actionable = input(false);
  readonly reactions = input<readonly MessageReaction[]>([]);
  /** The chips are words only: a wrapped-up Popkin takes no reaction (L2-045). */
  readonly readOnly = input(false);
  readonly quote = input<MessageQuote | null>(null);
  /** Tinted and outlined: the message a quote just went to (L2-025 AC3). */
  readonly marked = input(false);

  /** "Try again" on a message that was not sent. */
  readonly retry = output<void>();
  /** "Delete" on a message that was not sent. */
  readonly discard = output<void>();
  /** Enter, Space or a long press: open the message's actions. */
  readonly actions = output<void>();
  /** A reaction chip: the emoji whose reaction of the member's to toggle. */
  readonly react = output<string>();
  /** The quote: the id of the message it quotes. */
  readonly goToQuote = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private press: { x: number; y: number; timer: ReturnType<typeof setTimeout> } | null = null;
  /** A long press just opened the actions: the click its lift makes is not a choice. */
  private pressed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pressEnd());
  }

  /**
   * Scrolls the message to the middle of its scroller, smoothly or at once under reduced
   * motion, and gives it the focus (L2-025 AC3, L2-060).
   */
  reveal(): void {
    const element = this.host.nativeElement;
    const reduce = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    element.scrollIntoView({ block: 'center', behavior: reduce ? 'instant' : 'smooth' });
    element.focus({ preventScroll: true });
  }

  /** Enter or Space on the message itself, not on a chip or the quote inside it. */
  protected onKeydown(event: KeyboardEvent): void {
    if (!this.actionable() || event.target !== this.host.nativeElement) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.actions.emit();
  }

  protected pressStart(event: PointerEvent): void {
    this.pressed = false;
    if (!this.actionable() || !event.isPrimary || event.button > 0) return;
    this.pressEnd();
    this.press = {
      x: event.clientX,
      y: event.clientY,
      timer: setTimeout(() => {
        this.press = null;
        this.pressed = true;
        this.actions.emit();
      }, LONG_PRESS_MS),
    };
  }

  protected pressMove(event: PointerEvent): void {
    if (!this.press) return;
    const moved = Math.hypot(event.clientX - this.press.x, event.clientY - this.press.y);
    if (moved > LONG_PRESS_SLOP) this.pressEnd();
  }

  protected pressEnd(): void {
    if (!this.press) return;
    clearTimeout(this.press.timer);
    this.press = null;
  }

  /** The browser's own menu would cover the actions a long press opens. */
  protected onContextMenu(event: Event): void {
    if (this.press || this.pressed) event.preventDefault();
  }

  protected onQuote(messageId: string): void {
    if (this.pressed) {
      this.pressed = false;
      return;
    }
    this.goToQuote.emit(messageId);
  }
}
