import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatusTone = 'neutral' | 'ok' | 'warn' | 'bad' | 'info';

/**
 * Status pill (docs/design-system/components/status.html): a small pill with a dot and one or two
 * words saying what state a record is in: Active, Suspended, Failed. The words carry the state;
 * the `tone` only repeats it. `busy` turns the dot into a spinning ring for work under way.
 */
@Component({
  selector: 'span[pk-status]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status.html',
  styleUrl: './status.scss',
  host: {
    class: 'status',
    '[class.status--ok]': "tone() === 'ok'",
    '[class.status--warn]': "tone() === 'warn'",
    '[class.status--bad]': "tone() === 'bad'",
    '[class.status--info]': "tone() === 'info'",
    '[class.status--busy]': 'busy()',
  },
})
export class Status {
  readonly tone = input<StatusTone>('neutral');
  readonly busy = input(false);
}
