import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Contact timeline (docs/design-system/components/contact-timeline.html): what happened with a
 * contact, newest first, on their profile: one `li[pk-contact-timeline-item]` each, strung on a
 * thin line.
 */
@Component({
  selector: 'ol[pk-contact-timeline]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-timeline.html',
  styleUrl: './contact-timeline.scss',
  host: { class: 'contact-timeline' },
})
export class ContactTimeline {}
