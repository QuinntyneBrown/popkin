import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export interface ContactFact {
  icon: IconName;
  /** What the fact is, for assistive technology only: "Phone". The icon shows it. */
  label: string;
  value: string;
}

/**
 * Contact facts (docs/design-system/components/contact-id.html): how to reach someone and where
 * they live, one line each on a contact's profile, its icon standing for its name, which is read
 * by assistive technology.
 */
@Component({
  selector: 'dl[pk-contact-facts]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-facts.html',
  styleUrl: './contact-facts.scss',
  host: { class: 'contact-facts' },
})
export class ContactFacts {
  readonly facts = input.required<readonly ContactFact[]>();
}
