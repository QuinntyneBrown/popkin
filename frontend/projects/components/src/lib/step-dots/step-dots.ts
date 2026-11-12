import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Step dots (part of the top bar's design): where a person is in a short flow. */
@Component({
  selector: 'div[pk-step-dots]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './step-dots.html',
  styleUrl: './step-dots.scss',
  host: {
    class: 'step-dots',
    role: 'img',
    '[attr.aria-label]': "'Step ' + step() + ' of ' + steps()",
  },
})
export class StepDots {
  /** The current step, from 1. */
  readonly step = input.required<number>();
  readonly steps = input.required<number>();

  protected readonly dots = computed(() =>
    Array.from({ length: this.steps() }, (_, i) =>
      i + 1 < this.step() ? 'done' : i + 1 === this.step() ? 'current' : 'todo',
    ),
  );
}
