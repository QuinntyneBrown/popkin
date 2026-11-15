import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * Board (docs/design-system/components/plan.html): the plan board's four columns (L2-068 AC3).
 * Below 640 px each column is 84 % of the width and the board scrolls sideways with snapping;
 * from 640 px each is 300 px wide; from 1024 px the four share the width (AC8).
 *
 * While `loading` it draws skeleton columns and cards of the same size as the real ones, with a
 * status line for assistive technology (AC10).
 *
 * Slot: the default slot holds the four `pk-board-column`s.
 */
@Component({
  selector: 'div[pk-board]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './board.html',
  styleUrl: './board.scss',
  host: { class: 'board' },
})
export class Board {
  readonly loading = input(false);
}
