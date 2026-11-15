import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { StoryCardOwner } from '../story-card/story-card';

/** One of "Biggest open": its points, its title and its owner, if it has one. */
export interface BiggestStory {
  id: string;
  title: string;
  points: number;
  owner: StoryCardOwner | null;
}

/**
 * Biggest open (docs/design-system/components/plan.html): the three largest stories in To do
 * and Doing, each with its points named "{n} points", its title and its owner's avatar
 * (L2-071 AC6). With none, the line `empty` says so. Beside the chart from 1024 px, under it
 * below (AC7).
 */
@Component({
  selector: 'aside[pk-biggest-open]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './biggest-open.html',
  styleUrl: './biggest-open.scss',
  host: { class: 'biggest' },
})
export class BiggestOpen {
  readonly stories = input.required<BiggestStory[]>();
  /** "Nothing left open. Nice work, all six of you." */
  readonly empty = input('');

  protected pointsLabel(points: number): string {
    return points === 1 ? '1 point' : `${points} points`;
  }
}
