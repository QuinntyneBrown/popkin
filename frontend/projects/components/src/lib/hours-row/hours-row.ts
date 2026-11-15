import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Button } from '../button/button';
import { Icon } from '../icon/icon';

/** A working stretch as its two time fields hold it, "09:00" to "17:30"; empty when blank. */
export interface HoursStretch {
  start: string;
  end: string;
}

/**
 * Hours row (docs/design-system/components/schedule.html): one day of "My hours", a start and an
 * end on the quarter hour, a second stretch once "Add another" is chosen, and the day's error
 * under it (L2-074 AC8).
 */
@Component({
  selector: 'div[pk-hours-row]',
  imports: [Button, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hours-row.html',
  styleUrl: './hours-row.scss',
})
export class HoursRow {
  /** "Thu 17". */
  readonly day = input.required<string>();
  /** "Thursday", which names the fields. */
  readonly weekday = input.required<string>();
  /** One stretch, or two. */
  readonly stretches = model.required<HoursStretch[]>();
  /** What the day breaks: "Thursday ends before it starts."; null when nothing. */
  readonly error = input<string | null>(null);
  readonly disabled = input(false);

  protected readonly errorId = computed(() => `hours-${this.weekday().toLowerCase()}-err`);
  /** "Add another" is offered under a filled day with one stretch. */
  protected readonly canAdd = computed(() => {
    const stretches = this.stretches();
    return stretches.length === 1 && !!stretches[0].start && !!stretches[0].end;
  });

  protected set(index: number, part: 'start' | 'end', event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.stretches.update((stretches) =>
      stretches.map((stretch, i) => (i === index ? { ...stretch, [part]: value } : stretch)),
    );
  }

  protected addAnother(): void {
    this.stretches.update((stretches) => [...stretches, { start: '', end: '' }]);
  }
}
