import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/**
 * Colour picker (docs/design-system/components/colour-picker.html): the seven Popkin colours,
 * each a toggle button named by its colour; the chosen one is `aria-pressed`, ringed and dotted.
 */
@Component({
  selector: 'div[pk-colour-picker]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './colour-picker.html',
  styleUrl: './colour-picker.scss',
})
export class ColourPicker {
  readonly heading = input('And a colour');
  /**
   * Where the picker is one field of a form, such as in a dialog: a field label in place of the
   * heading, as "Emoji" or "Colour".
   */
  readonly label = input<string>();
  readonly options = input.required<readonly string[]>();
  readonly value = model.required<string>();
}
