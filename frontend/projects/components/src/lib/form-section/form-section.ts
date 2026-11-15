import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/**
 * Form section (docs/design-system/components/form-sections.html, `form-section`): one part of
 * a long form, a section named by its title, with a hint under it; its fields are the default
 * slot. From M the title sits in a 160 px column beside the fields. Ruled from the next section.
 */
@Component({
  selector: 'section[pk-form-section]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-section.html',
  styleUrl: './form-section.scss',
  host: { class: 'form-section', '[attr.aria-labelledby]': 'headingId' },
})
export class FormSection {
  /** "Dates to remember". */
  readonly heading = input.required<string>();
  /** "We’ll nudge you ahead of each one." */
  readonly hint = input<string>();

  protected readonly headingId = `form-section-${++nextId}-h`;
}
