import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { Badge } from '../badge/badge';
import { PopkinTile } from '../popkin-tile/popkin-tile';
import { TimeLeft } from '../time-left/time-left';

/** One active Popkin of the grid: what its card shows and where it leads. */
export interface GridPopkin {
  /** The route that opens the Popkin. */
  link?: string | readonly unknown[];
  /** The Popkin's address, where it opens as a full page load. Wins over `link`. */
  href?: string;
  /** The `data-accent` value of the Popkin's colour. */
  accent: string;
  emoji: string;
  name: string;
  /** Its latest message, as it reads: "Mara: last call for the canoe sign-up". Empty for none. */
  last: string;
  /** Up to three of its members. */
  avatars: readonly StackAvatar[];
  /** How many members the avatars leave out; 0 shows no "+N". */
  more: number;
  /** How many members it has, in words, for assistive technology: "14 members". */
  members: string;
  /** How long it has, in words: "1 day 6 hrs left", "Until Nov 30", "Ongoing". */
  time: string;
  /** It has no end: the time is plain words, not the pill of a Popkin that ends. */
  ongoing: boolean;
  /** Messages not yet read; 0 shows no badge. */
  unread: number;
  /** The badge's accessible name: "3 unread messages". */
  unreadLabel: string;
}

/**
 * The active Popkins of Your Popkins (docs/design-system/components/card.html, `popkin-grid` of
 * `popkin-card`): one card for each Popkin, on a tint of its colour, with its tile, its name (an
 * `h2`), its latest message, a few faces, the time it has left and the unread badge. The cards
 * are one across on a phone, two from 640 px and three from 1024 px (L2-058 AC6); from 640 px
 * the cards of a row are as tall as each other and the message may take two lines. Each card is
 * one link. The list sets its own distance from the page's heading.
 */
@Component({
  selector: 'ul[pk-popkin-grid]',
  imports: [AvatarStack, Badge, NgTemplateOutlet, PopkinTile, RouterLink, TimeLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popkin-grid.html',
  styleUrl: './popkin-grid.scss',
  host: { class: 'popkin-grid' },
})
export class PopkinGrid {
  /** The Popkins in the order they show: the most recently active first. */
  readonly popkins = input.required<readonly GridPopkin[]>();
}
