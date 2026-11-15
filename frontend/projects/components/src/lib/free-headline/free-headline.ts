import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Free headline (docs/design-system/components/schedule.html): the chosen evening in a line, the
 * time everyone is free stressed in the Popkin's colour, a sentence under it, and the action
 * beside it from 1024 px, under it narrower (L2-074 AC3, AC4, AC10).
 *
 * Slots: the default slot holds the action, a `pk-button` link.
 */
@Component({
  selector: 'section[pk-free-headline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './free-headline.html',
  styleUrl: './free-headline.scss',
  host: { class: 'free' },
})
export class FreeHeadline {
  /** "Wednesday, everyone’s free from ". */
  readonly headline = input.required<string>();
  /** The words to stress after it: "7:30 pm."; none when someone is working. */
  readonly time = input<string | null>(null);
  readonly sub = input.required<string>();
}
