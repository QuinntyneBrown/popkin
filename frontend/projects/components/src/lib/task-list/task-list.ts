import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IconName } from '../icon/icons';
import { Task } from '../task/task';

/** One follow-up or promise of a task list. */
export interface TaskListItem {
  id: string;
  text: string;
  done: boolean;
  /** Who it is for, a link to them, with their avatar. */
  who?: string;
  whoLink?: string | readonly unknown[];
  whoPhoto?: string | null;
  whoAccent?: string;
  /** "You promised · Messages, Sep 3", or "Follow-up". */
  note?: string;
  noteIcon?: IconName;
  /** "2 days late", "Today", "Thu", "Sep 20", "Done Sep 10". */
  due?: string;
  late?: boolean;
}

/**
 * Task list (docs/design-system/components/task.html): the follow-ups of one bucket, each a
 * `pk-task` ticked off in place. `divided` draws a hairline between them, as the open buckets do;
 * Done's list has none.
 */
@Component({
  selector: 'ul[pk-task-list]',
  imports: [Task],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './task-list.html',
  styleUrl: './task-list.scss',
  host: { class: 'task-list', '[class.divided]': 'divided()' },
})
export class TaskList {
  readonly tasks = input.required<readonly TaskListItem[]>();
  readonly divided = input(true);
  /** A task ticked done or opened again. */
  readonly doneChange = output<{ id: string; done: boolean }>();
}
