import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One recent action: who did what to what, and when. */
export interface LogEntry {
  /** Who did it: "Aiko". */
  actor: string;
  /** What they did, muted: "removed content". */
  action: string;
  /** What they did it to: "Message in Class of 2015 Reunion". */
  target: string;
  /** When, as the admin reads it: "10:39". */
  when: string;
}

/**
 * Log list (docs/design-system/components/activity-lists.html, `log`): recent actions in a
 * panel, as text. Nothing in it can be pressed.
 */
@Component({
  selector: 'ul[pk-log-list]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-list.html',
  styleUrl: './log-list.scss',
  host: { class: 'log' },
})
export class LogList {
  readonly entries = input.required<readonly LogEntry[]>();
}
