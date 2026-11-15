import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PLAN_API, POPKINS_API, StoryColumn, StoryView, moveOf, storyLine, whoChipsOf } from 'api';
import {
  Alert,
  Button,
  DialogFrame,
  FieldLabel,
  PointsPicker,
  SegmentedControl,
  SegmentedOption,
  TagPicker,
  TextField,
  WhoChips,
} from 'components';
import { catchError, map, of } from 'rxjs';

export interface StoryData {
  popkinId: string;
  accent: string;
  story: StoryView;
}

/**
 * A story (L2-070): titled with it, it shows its column, points, owner, tag and due date, and
 * moves it on or marks it done at once. It closes with the story as saved; a failure keeps it
 * open. A sheet on a phone and a panel beside the board from 768 px, as "New story" is.
 */
@Component({
  selector: 'pk-story-dialog',
  imports: [
    Alert,
    Button,
    DialogFrame,
    FieldLabel,
    PointsPicker,
    ReactiveFormsModule,
    SegmentedControl,
    TagPicker,
    TextField,
    WhoChips,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './story.dialog.html',
})
export class StoryDialog {
  protected readonly data = inject<StoryData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<StoryView>>(DialogRef);
  private readonly api = inject(PLAN_API);
  private readonly popkins = inject(POPKINS_API);

  private readonly story = this.data.story;
  protected readonly line = storyLine(this.story);
  protected readonly move = moveOf(this.story.column);
  protected readonly done = this.story.column === 'Done';
  protected readonly whereOptions: SegmentedOption[] = [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'ToDo', label: 'This sprint' },
    { value: 'Doing', label: 'Doing' },
    { value: 'Done', label: 'Done' },
  ];
  protected readonly title = new FormControl(this.story.title, { nonNullable: true });
  protected readonly due = new FormControl(this.story.dueDate ?? '', { nonNullable: true });
  protected readonly where = signal<string>(this.story.column);
  protected readonly points = signal(this.story.points);
  protected readonly owner = signal<string | null>(this.story.owner?.membershipId ?? null);
  protected readonly tag = signal<string>(this.story.tag);
  protected readonly members = toSignal(
    this.popkins.getMembers(this.data.popkinId).pipe(
      map(whoChipsOf),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  /** "Move to {next column}" or "Mark done": at once, and the dialog closes (L2-070 AC2). */
  protected moveTo(column: StoryColumn): void {
    if (this.busy()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api.moveStory(this.data.popkinId, this.story.id, column).subscribe({
      next: (story) => this.ref.close(story),
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
