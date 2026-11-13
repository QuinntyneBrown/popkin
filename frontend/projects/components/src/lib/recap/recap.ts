import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AvatarStack, StackAvatar } from '../avatar-stack/avatar-stack';
import { ExperienceRow } from '../experience-row/experience-row';
import { Polaroids } from '../polaroids/polaroids';
import { RouterLink } from '@angular/router';
import { Skeleton } from '../skeleton/skeleton';
import { Stat } from '../stat/stat';
import { StatPair } from '../stat-pair/stat-pair';

/** A total of the recap: "1,286" "messages sent". */
export interface RecapStat {
  /** As it reads, thousands separators included. */
  value: string;
  label: string;
}

/** The top-rated experience of the Popkin. */
export interface RecapMoment {
  title: string;
  photo: string | null;
  /** Shown on the Popkin's tint when it has no picture. */
  emoji?: string;
  /** Its average, as it reads: "4.7". */
  rating: string;
  /** Who shared it, in words: "shared by Mara". */
  by: string;
  /** The route of the experience. */
  link: string | readonly unknown[];
}

/**
 * Recap (docs/design-system/components/recap.html): the front page of a Popkin that has wrapped
 * up. The collage and the headline (`recap__lead`), then the people who showed up with the
 * totals, the top-rated moment where there is one, and the actions (`recap__rest`). One column
 * to 1024 px, where the collage sits beside the numbers and the actions (L2-058 AC11).
 *
 * The projected content is the actions, block buttons in order: the page projects "Save the
 * album" (and the progress under it while the album is prepared), then what comes next, then
 * "Read the chat". While `loading`, it draws skeletons in its shape and says so to assistive
 * technology. Put it in a `pk-screen` with `surface="wash"` and `body="recap"`.
 */
@Component({
  selector: 'div[pk-recap]',
  imports: [AvatarStack, ExperienceRow, Polaroids, RouterLink, Skeleton, Stat, StatPair],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recap.html',
  styleUrl: './recap.scss',
  host: { '[class.recap]': '!loading()', '[class.recap-skeleton]': 'loading()' },
})
export class Recap {
  readonly loading = input(false);
  /** The screen's heading while it loads, for assistive technology only. */
  readonly loadingHeading = input('Recap');
  readonly loadingText = input('Loading the recap…');
  /** Up to three photos of the Popkin for the collage. None: its emoji alone. */
  readonly photos = input<readonly string[]>([]);
  readonly emoji = input('');
  /** "This Popkin wrapped up. What a time." */
  readonly heading = input('');
  /** The Popkin's name and dates: "Lakeside Weekend · Fri 11 – Sun 13 Sep". */
  readonly line = input('');
  /** The first members' faces, and how many more there are. */
  readonly avatars = input<readonly StackAvatar[]>([]);
  readonly more = input(0);
  /** How many showed up, in words: "14 people showed up". */
  readonly people = input('');
  /** The two totals. */
  readonly stats = input<readonly RecapStat[]>([]);
  /** The top-rated experience. Left out when nothing was rated. */
  readonly moment = input<RecapMoment | null>(null);
  readonly momentLabel = input('Top-rated moment');
}
