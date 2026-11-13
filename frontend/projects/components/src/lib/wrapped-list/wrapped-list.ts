import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/** One wrapped-up Popkin of the list. */
export interface WrappedPopkin {
  /** The route that opens its recap. */
  link?: string | readonly unknown[];
  /** The address of its recap, where it opens as a full page load. Wins over `link`. */
  href?: string;
  /** The `data-accent` value of the Popkin's colour. */
  accent: string;
  emoji: string;
  name: string;
  /** What is left of it, as it reads: "Wrapped Mar 8 · 48 people · 312 photos". */
  summary: string;
}

/**
 * The "Wrapped up" section of Your Popkins (docs/design-system/components/list-row.html, `row`
 * in a `divided divided--grid` list): a muted heading and one row for each wrapped-up Popkin,
 * with its greyed tile, its name, what is left of it and the label of where the row leads
 * ("Recap"). The rows are one across on a phone, two from 768 px and three from 1024 px, in the
 * columns of the cards above them. Each row is a link. Leave the section out when there is no
 * wrapped-up Popkin (L2-018 AC3).
 */
@Component({
  selector: 'div[pk-wrapped-list]',
  imports: [NgTemplateOutlet, PopkinTile, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './wrapped-list.html',
  styleUrl: './wrapped-list.scss',
  host: { class: 'wrapped-list' },
})
export class WrappedList {
  /** The section's `h2`: "Wrapped up". */
  readonly heading = input.required<string>();
  /** The label at the end of each row, which says where it leads: "Recap". */
  readonly action = input.required<string>();
  /** The Popkins in the order they show: the latest to wrap up first. */
  readonly popkins = input.required<readonly WrappedPopkin[]>();
}
