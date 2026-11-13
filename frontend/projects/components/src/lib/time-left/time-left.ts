import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Time left (docs/design-system/components/time-left.html): how long a Popkin has, in words, in
 * its colour. The ring is decoration; the projected text says it.
 */
@Component({
  selector: 'span[pk-time-left]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './time-left.html',
  styleUrl: './time-left.scss',
  host: { class: 'time-left' },
})
export class TimeLeft {}
