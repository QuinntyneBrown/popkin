import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Status note (docs/design-system/components/status-note.html): a one-line confirmation in place,
 * under the action that caused it, announced politely: "Saved just now". The words carry the
 * state; the check and the colour only repeat it.
 */
@Component({
  selector: 'p[pk-status-note]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './status-note.html',
  styleUrl: './status-note.scss',
  host: { class: 'status-note', role: 'status' },
})
export class StatusNote {}
