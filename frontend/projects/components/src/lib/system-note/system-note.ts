import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * System note (docs/design-system/components/message.html): a line the Popkin itself says in a
 * thread, such as who popped in. The `name` is in ink; `text` is the rest of the line, set one
 * space after the name.
 */
@Component({
  selector: 'p[pk-system-note]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-note.html',
  styleUrl: './system-note.scss',
  host: { class: 'system-note' },
})
export class SystemNote {
  readonly name = input<string>();
  readonly text = input.required<string>();
}
