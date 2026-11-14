import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

export interface EmojiOption {
  emoji: string;
  label: string;
}

/**
 * Emoji picker (docs/design-system/components/emoji-picker.html): a group of toggle buttons;
 * the chosen one is `aria-pressed` and ringed, not only coloured (L2-008 AC2, L2-057 AC5).
 */
@Component({
  selector: 'div[pk-emoji-picker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './emoji-picker.html',
  styleUrl: './emoji-picker.scss',
})
export class EmojiPicker {
  readonly heading = input('Pick an emoji');
  /**
   * Where the picker is one field of a form, such as in a dialog: a field label in place of the
   * heading, as "Emoji" or "Colour".
   */
  readonly label = input<string>();
  readonly options = input.required<readonly EmojiOption[]>();
  readonly value = model.required<string>();
}
