import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Panel (docs/design-system/components/panel.html): a white card on the console's sand page that
 * holds a table, a list or a form. With a `heading` it has a head; without one its content runs
 * to its edges, as a table does.
 */
@Component({
  selector: 'section[pk-panel]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  host: { class: 'panel', '[class.panel--danger]': "variant() === 'danger'" },
})
export class Panel {
  readonly heading = input<string>();
  readonly sub = input<string>();
  readonly variant = input<'default' | 'danger'>('default');
  /** Whether it has a foot (`[slot=foot]`): a count and a button, as "Older actions". */
  readonly foot = input(false);
}
