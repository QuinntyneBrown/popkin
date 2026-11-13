import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One step: what a person does, and a sentence about it. */
export interface StepView {
  heading: string;
  text: string;
}

/**
 * Steps (docs/design-system/components/steps.html): what happens, in order, as a numbered list.
 * The list is an `ol`, so the order is read without the numbers on the discs, which are
 * decoration. One column on a phone, the steps side by side from 768 px (L2-001 AC2, AC5).
 */
@Component({
  selector: 'ol[pk-steps]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './steps.html',
  styleUrl: './steps.scss',
  host: { class: 'steps' },
})
export class Steps {
  readonly steps = input.required<readonly StepView[]>();
}
