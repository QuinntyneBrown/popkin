import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  COMMENT_MAX,
  EXPERIENCES_API,
  ExperienceCommentView,
  commentProblem,
  starsLabel,
  toApiProblem,
} from 'api';
import { Alert, Button, DialogFrame, Stars, Textarea } from 'components';

export interface AddCommentData {
  popkinId: string;
  experienceId: string;
  accent: string;
  /** The experience's title names the dialog. */
  title: string;
  /** The stars the member gave. */
  stars: number;
  /** What they said before; empty for a first comment. */
  text: string;
}

/**
 * "Add a comment" (L2-041): the member's stars and a few words to go with them. It closes
 * with the saved comment. The CDK dialog that opens it closes on Escape and returns focus
 * to what opened it.
 */
@Component({
  selector: 'pk-add-comment-dialog',
  imports: [Alert, Button, DialogFrame, ReactiveFormsModule, Stars, Textarea],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './add-comment.dialog.html',
})
export class AddCommentDialog {
  protected readonly data = inject<AddCommentData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<ExperienceCommentView>>(DialogRef);
  private readonly api = inject(EXPERIENCES_API);
  private readonly field = viewChild.required(Textarea);

  protected readonly max = COMMENT_MAX;
  protected readonly starsLabel = starsLabel(this.data.stars);
  protected readonly text = new FormControl(this.data.text, { nonNullable: true });
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  /** L2-041 AC2: an empty comment sends nothing and says what to fix. */
  protected post(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    const problem = commentProblem(this.text.value);
    this.error.set(problem);
    this.failed.set(false);
    if (problem) {
      this.field().focus();
      return;
    }
    this.busy.set(true);
    this.api.comment(this.data.popkinId, this.data.experienceId, this.text.value.trim()).subscribe({
      next: (comment) => this.ref.close(comment),
      error: (error: unknown) => {
        this.busy.set(false);
        const refused = commentProblem(this.text.value, toApiProblem(error).code);
        this.error.set(refused);
        this.failed.set(!refused);
        if (refused) this.field().focus();
      },
    });
  }
}
