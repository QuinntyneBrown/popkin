import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Form pair (docs/design-system/components/form-sections.html, `form-section__pair`): two fields
 * of a form section side by side from 640 px, one above the other below it.
 */
@Component({
  selector: 'div[pk-form-pair]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-pair.html',
  styleUrl: './form-pair.scss',
  host: { class: 'form-section__pair' },
})
export class FormPair {}
