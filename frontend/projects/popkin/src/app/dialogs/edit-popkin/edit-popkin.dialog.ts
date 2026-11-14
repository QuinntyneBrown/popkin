import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  POPKIN_COLOURS,
  POPKIN_EMOJI,
  POPKIN_NAME_MAX,
  POPKINS_API,
  PopkinColour,
  PopkinSettingsView,
  accentOf,
} from 'api';
import { Alert, Button, ColourPicker, DialogFrame, EmojiPicker, TextField } from 'components';

export interface EditPopkinData {
  popkinId: string;
  name: string;
  emoji: string;
  colour: PopkinColour;
}

/**
 * "Edit name and look" (L2-020 AC3, AC6): the Host's name, emoji and colour for the Popkin, under
 * the rules of L2-008. It closes with the Popkin as saved; a failure keeps it open with what was
 * entered.
 */
@Component({
  selector: 'pk-edit-popkin-dialog',
  imports: [Alert, Button, ColourPicker, DialogFrame, EmojiPicker, ReactiveFormsModule, TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './edit-popkin.dialog.html',
})
export class EditPopkinDialog {
  protected readonly data = inject<EditPopkinData>(DIALOG_DATA);
  private readonly ref = inject<DialogRef<PopkinSettingsView>>(DialogRef);
  private readonly api = inject(POPKINS_API);

  protected readonly emoji = POPKIN_EMOJI;
  protected readonly colours = POPKIN_COLOURS;
  protected readonly nameMax = POPKIN_NAME_MAX;
  protected readonly name = new FormControl(this.data.name, { nonNullable: true });
  private readonly nameValue = toSignal(this.name.valueChanges, { initialValue: this.data.name });
  protected readonly chosenEmoji = signal(this.data.emoji);
  protected readonly colour = signal<PopkinColour>(this.data.colour);
  protected readonly accent = computed(() => accentOf(this.colour()));
  /** L2-008 AC3: a Popkin has a name; without one nothing is sent. */
  protected readonly nameMissing = computed(() => this.nameValue().trim().length === 0);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  protected chooseEmoji(emoji: string): void {
    if (!this.busy()) this.chosenEmoji.set(emoji);
  }

  protected chooseColour(colour: string): void {
    if (!this.busy()) this.colour.set(colour as PopkinColour);
  }

  /** "Save" is sent once; while it goes, it reads "Saving…" (L2-056 AC3). */
  protected save(): void {
    if (this.busy() || this.nameMissing()) return;
    this.busy.set(true);
    this.failed.set(false);
    this.api
      .changeLook(this.data.popkinId, {
        name: this.nameValue().trim(),
        emoji: this.chosenEmoji(),
        colour: this.colour(),
      })
      .subscribe({
        next: (saved) => this.ref.close(saved),
        error: () => {
          this.busy.set(false);
          this.failed.set(true);
        },
      });
  }

  protected cancel(): void {
    this.ref.close();
  }
}
