import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PLAN_API, POPKINS_API, StoryTag, StoryView, whoChipsOf } from 'api';
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

export interface NewStoryData {
  popkinId: string;
  accent: string;
  /** A starter's title, already filled in (L2-068 AC9). */
  title?: string;
}

/**
 * "New story" (L2-069): what needs doing, where it goes, how big it is, who is on it and its
 * tag. It closes with the story as saved; a failure keeps everything entered. A sheet on a phone
 * and a panel beside the board from 768 px (AC7).
 */
@Component({
  selector: 'pk-new-story-dialog',
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
  templateUrl: './new-story.dialog.html',
})
export class NewStoryDialog {
  protected readonly data = inject<NewStoryData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<StoryView>>(DialogRef);
  private readonly api = inject(PLAN_API);
  private readonly popkins = inject(POPKINS_API);

  protected readonly whereOptions: SegmentedOption[] = [
    { value: 'Backlog', label: 'Backlog' },
    { value: 'ToDo', label: 'This sprint' },
  ];
  protected readonly title = new FormControl(this.data.title ?? '', { nonNullable: true });
  protected readonly where = signal('ToDo');
  protected readonly points = signal(2);
  protected readonly owner = signal<string | null>(null);
  protected readonly tag = signal('Travel');
  protected readonly members = toSignal(
    this.popkins.getMembers(this.data.popkinId).pipe(
      map(whoChipsOf),
      catchError(() => of([])),
    ),
    { initialValue: [] },
  );
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly titleError = signal<string | undefined>(undefined);
  /** "Add to backlog" or "Add to To do", to match the column chosen (AC3). */
  protected readonly action = computed(() =>
    this.where() === 'Backlog' ? 'Add to backlog' : 'Add to To do',
  );

  /** Sent once; while it goes it reads "Adding…" (AC5). */
  protected add(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    const title = this.title.value.trim();
    if (!title) {
      this.titleError.set('Say what needs doing.');
      return;
    }
    this.titleError.set(undefined);
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .addStory(this.data.popkinId, {
        title,
        column: this.where() === 'Backlog' ? 'Backlog' : 'ToDo',
        points: this.points(),
        ownerMembershipId: this.owner(),
        tag: this.tag() as StoryTag,
      })
      .subscribe({
        next: (story) => this.ref.close(story),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }
}
