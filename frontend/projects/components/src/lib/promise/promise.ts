import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconButton } from '../icon-button/icon-button';

/**
 * Promise (docs/design-system/components/task.html): a promise or follow-up added while logging a
 * conversation, in the tint of its `data-accent`, with when it will remind you and a button to
 * take it off again (`removed`).
 */
@Component({
  selector: 'div[pk-promise]',
  imports: [Icon, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './promise.html',
  styleUrl: './promise.scss',
  host: { class: 'promise' },
})
export class ContactPromise {
  readonly text = input.required<string>();
  /** When it reminds you: "Remind me Thu, Sep 17". */
  readonly when = input<string>();
  readonly removed = output<void>();
}
