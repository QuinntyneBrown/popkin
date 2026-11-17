import { DIALOG_DATA, Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  PLAN_API,
  POPKINS_API,
  StoryColumn,
  StoryTag,
  StoryView,
  moveOf,
  storyLine,
  whoChipsOf,
  dialogConfig,
} from 'api';
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
import { Observable, catchError, map, of } from 'rxjs';
import {
  DELETE_STORY,
  DeleteStoryData,
  DeleteStoryDialog,
} from '../delete-story/delete-story.dialog';

export interface StoryData {
  popkinId: string;
  accent: string;
  story: StoryView;
}

/** The story as saved or moved, or `'deleted'` once it is gone (L2-070 AC4). */
export type StoryClosed = StoryView | 'deleted';

/**
 * A story (L2-070): titled with it, it shows its column, points, owner, tag and due date, and
 * moves it on or marks it done at once. It closes with the story as saved; a failure keeps it
 * open. "Delete", for the person who added it, its owner or the Host, asks first and closes it
 * with `'deleted'`. A sheet on a phone and a panel beside the board from 768 px, as "New story" is.
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
  private readonly ref = inject<DialogRef<StoryClosed>>(DialogRef);
  private readonly dialog = inject(Dialog);
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
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly titleError = signal<string | undefined>(undefined);

  /** "Save": the rules of a new story apply; while it goes it reads "Saving…" (L2-070 AC3). */
  protected save(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    const title = this.title.value.trim();
    if (!title) {
      this.titleError.set('Say what needs doing.');
      return;
    }
    this.titleError.set(undefined);
    this.send(
      this.api.saveStory(this.data.popkinId, this.story.id, {
        title,
        column: this.where() as StoryColumn,
        points: this.points(),
        ownerMembershipId: this.owner(),
        tag: this.tag() as StoryTag,
        dueDate: this.due.value || null,
      }),
      true,
    );
  }

  /** "Move to {next column}" or "Mark done": at once, and the dialog closes (L2-070 AC2). */
  protected moveTo(column: StoryColumn): void {
    if (this.busy()) return;
    this.send(this.api.moveStory(this.data.popkinId, this.story.id, column), false);
  }

  /** "Delete": "Delete this story?" first; once it is gone, so is this dialog (L2-070 AC4). */
  protected remove(): void {
    if (this.busy()) return;
    const confirm = this.dialog.open<boolean, DeleteStoryData>(
      DeleteStoryDialog,
      dialogConfig({
        data: { popkinId: this.data.popkinId, storyId: this.story.id, accent: this.data.accent },
        ...DELETE_STORY,
      }),
    );
    confirm.closed.subscribe((deleted) => {
      if (deleted) this.ref.close('deleted');
    });
  }

  private send(request: Observable<StoryView>, saving: boolean): void {
    this.busy.set(true);
    this.saving.set(saving);
    this.failed.set(false);
    request.subscribe({
      next: (story) => this.ref.close(story),
      error: () => {
        this.busy.set(false);
        this.saving.set(false);
        this.failed.set(true);
      },
    });
  }
}
