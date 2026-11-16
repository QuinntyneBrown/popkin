import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ContactTimelineKind = 'conversation' | 'milestone' | 'memory';

/** Each kind's colour on the line, and its word for assistive technology. */
const KINDS: Record<ContactTimelineKind, { accent: string; word: string }> = {
  conversation: { accent: 'coral', word: 'Conversation' },
  milestone: { accent: 'amber', word: 'Milestone' },
  memory: { accent: 'teal', word: 'Memory' },
};

/**
 * Contact timeline item (docs/design-system/components/contact-timeline.html): one conversation,
 * milestone or memory on a contact's timeline. Its dot takes the kind's colour and its kind is
 * said in words to assistive technology. A conversation says how (`via`: "Phone · 40 min"); a
 * milestone is a tinted card with a `tag` ("New job"); a memory may carry a `photo`.
 */
@Component({
  selector: 'li[pk-contact-timeline-item]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-timeline-item.html',
  styleUrl: './contact-timeline-item.scss',
  host: {
    class: 'contact-timeline__item',
    '[class.contact-timeline__item--milestone]': "kind() === 'milestone'",
    '[attr.data-accent]': 'shown().accent',
  },
})
export class ContactTimelineItem {
  readonly kind = input.required<ContactTimelineKind>();
  /** The day, such as "Sep 6" or "Sep 26, 2021". */
  readonly date = input.required<string>();
  /** A milestone's or a memory's title; a conversation has none (known gap 106, ruled). */
  readonly title = input<string>();
  readonly body = input<string>();
  /** How a conversation happened: "Phone", "In person". */
  readonly via = input<string>();
  /** A milestone's kind: "New job". */
  readonly tag = input<string>();
  readonly photo = input<string>();
  /** What the photo shows. */
  readonly photoAlt = input('');

  protected readonly shown = computed(() => KINDS[this.kind()]);
}
