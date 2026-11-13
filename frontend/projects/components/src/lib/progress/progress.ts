import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Progress (docs/design-system/components/progress.html): a bar in the Popkin's colour for work
 * whose length is known, with a count under it: "Uploading 2 of 3". The count is a count, not a
 * percentage, and is what assistive technology reads as the bar's value. Set `data-accent` on an
 * ancestor.
 */
@Component({
  selector: 'div[pk-progress]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './progress.html',
  styleUrl: './progress.scss',
})
export class Progress {
  /** How far along, from 0 to 100. */
  readonly value = input.required<number>();
  /** What is in progress, the bar's accessible name: "Uploading". */
  readonly label = input.required<string>();
  /** The count under the bar: "Uploading 2 of 3". */
  readonly text = input<string>();

  protected readonly percent = computed(() => {
    const value = this.value();
    return Number.isFinite(value) ? Math.round(Math.min(100, Math.max(0, value))) : 0;
  });
}
