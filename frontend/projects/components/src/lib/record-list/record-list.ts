import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/** One record a person or a Popkin has, such as a Popkin they belong to, and where it opens. */
export interface RecordItem {
  /** The Popkin's emoji, drawn on its tile. */
  emoji: string;
  /** The `data-accent` of its colour. */
  accent: string;
  /** "Lakeside Weekend". */
  title: string;
  /** "Host · 10 members · Ends 28 Jul". */
  sub?: string;
  link: string | readonly unknown[];
}

/**
 * Record list (docs/design-system/components/activity-lists.html, `records`/`record`): the
 * records of one person or Popkin in a panel, ruled between. Each is one link: its tile, its
 * title and a line under it, each cut short where it does not fit, and a chevron.
 */
@Component({
  selector: 'ul[pk-record-list]',
  imports: [Icon, PopkinTile, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './record-list.html',
  styleUrl: './record-list.scss',
  host: { class: 'records' },
})
export class RecordList {
  readonly items = input.required<readonly RecordItem[]>();
}
