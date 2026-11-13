import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Field label (docs/design-system/components/text-field.html, `field__label`) on its own: the
 * visible name above a control that is not a text field, such as the theme's segmented control.
 * The control names itself for assistive technology; this is what the eye reads.
 */
@Component({
  selector: 'span[pk-field-label]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './field-label.html',
  styleUrl: './field-label.scss',
  host: { class: 'field__label' },
})
export class FieldLabel {}
