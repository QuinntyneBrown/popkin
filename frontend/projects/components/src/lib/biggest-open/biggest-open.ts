import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BiggestRows, BiggestStory } from '../biggest-rows/biggest-rows';

/**
 * Biggest open (docs/design-system/components/plan.html): the three largest stories in To do
 * and Doing, as `pk-biggest-rows` (L2-071 AC6). With none, the line `empty` says so. Beside the
 * chart from 1024 px, under it below (AC7).
 */
@Component({
  selector: 'aside[pk-biggest-open]',
  imports: [BiggestRows],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './biggest-open.html',
  styleUrl: './biggest-open.scss',
  host: { class: 'biggest' },
})
export class BiggestOpen {
  readonly stories = input.required<BiggestStory[]>();
  /** "Nothing left open. Nice work, all six of you." */
  readonly empty = input('');
}
