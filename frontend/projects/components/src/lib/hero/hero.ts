import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { Qr } from '../qr/qr';
import { TimeLeft } from '../time-left/time-left';

/** A line of chat in the hero's preview; `mine` sets it at the end, in the Popkin's colour. */
export interface HeroMessage {
  text: string;
  mine?: boolean;
}

/** The Popkin the hero shows as an example. It is a picture: nothing in it can be pressed. */
export interface HeroPreview {
  /** The `data-accent` value of the Popkin's colour. */
  accent: string;
  emoji: string;
  name: string;
  /** A few faces of its members, and how many more there are. Decoration. */
  avatars: readonly StackAvatar[];
  more: number;
  /** The count in words: "14 here". */
  members: string;
  /** "Wraps up Sunday". */
  timeLeft: string;
  /** Three photos. Decoration. */
  photos: readonly string[];
  messages: readonly HeroMessage[];
  /** The QR code beside the card from 576 px: its matrix and the link as people read it. */
  qr: { modules: boolean[][]; link: string };
}

/**
 * Hero (docs/design-system/components/hero.html): the first section of the landing page. The
 * headline is the page's `h1`; under it one paragraph, the main action (`[slot=action]`, a
 * primary `a[pk-button]`) and a note beside it. The preview of a Popkin is under the text and,
 * from 992 px, beside it (L2-001 AC1, AC5, AC6).
 *
 * In the preview the tile, the faces and the photos are hidden from assistive technology; the
 * name, the count, the time left and the messages are read, and the QR code is an image named
 * after its link (L2-057 AC6).
 */
@Component({
  selector: 'section[pk-hero]',
  imports: [AvatarStack, PopkinTile, Qr, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
  host: { class: 'container hero' },
})
export class Hero {
  /** The `h1` of the page. */
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  /** The line beside the action: "Takes about a minute." */
  readonly note = input<string>();
  readonly preview = input.required<HeroPreview>();
}
