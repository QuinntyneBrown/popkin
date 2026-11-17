import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Sending status (docs/design-system/components/send-status.html): whether member email is going
 * out, in a panel with one action (L2-169 AC2, AC3). Sending reads with a teal dot; paused, the
 * panel turns coral and is announced as a status. The words carry the state; the dot and the
 * colour only repeat it. Its action is projected.
 */
@Component({
  selector: 'section[pk-send-status]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './send-status.html',
  styleUrl: './send-status.scss',
  host: {
    class: 'send-status',
    '[class.send-status--paused]': "state() === 'paused'",
    '[attr.role]': "state() === 'paused' ? 'status' : null",
    'aria-labelledby': 'send-h',
  },
})
export class SendStatus {
  readonly state = input<'sending' | 'paused'>('sending');
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
