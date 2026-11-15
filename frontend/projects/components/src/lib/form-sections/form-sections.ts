import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Form sections (docs/design-system/components/form-sections.html, `form-sections`): a long
 * form, such as Add someone, split into `section[pk-form-section]`s, at most the narrow
 * container wide. The form checks itself (`novalidate`); its submit is the consumer's.
 */
@Component({
  selector: 'form[pk-form-sections]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-sections.html',
  styleUrl: './form-sections.scss',
  host: { class: 'form-sections', novalidate: '' },
})
export class FormSections {}
