import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { StoryCardOwner } from '../story-card/story-card';

/** One of the biggest open stories: its points, its title and its owner, if it has one. */
export interface BiggestStory {
  id: string;
  title: string;
  points: number;
  owner: StoryCardOwner | null;
}

/**
 * The rows of "Biggest open" (docs/design-system/components/plan.html, `.biggest`): each story's
 * points named "{n} points", its title and its owner's avatar, a hairline between them. The
 * burn-down's `pk-biggest-open` and the home's `pk-plan-card` list them (L2-071 AC6, L2-075 AC1).
 */
@Component({
  selector: 'ol[pk-biggest-rows]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './biggest-rows.html',
  styleUrl: './biggest-rows.scss',
  host: { class: 'biggest__list' },
})
export class BiggestRows {
  readonly stories = input.required<BiggestStory[]>();

  protected pointsLabel(points: number): string {
    return points === 1 ? '1 point' : `${points} points`;
  }
}
