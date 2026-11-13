import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * A section of a screen (docs/design-system/components/home-header.html, `section-head`): a head
 * with the section's `h2`, a count beside it and a link to all of it, then its content. The
 * link's words are the same in every section ("See all"), so it also says what it leads to, for
 * assistive technology only (`linkSuffix`: "photos").
 *
 * `lead` is the first section of the home: no head, a card set in from the sides.
 *
 * Slots: the default slot holds content that reaches the sides itself (a photo strip, rows that
 * are cards, a list); `[slot=inset]` is set in from the sides (a card with the section's empty
 * state); `[slot=failure]` is set in under the head (the alert of a section that did not load).
 */
@Component({
  selector: 'section[pk-section]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './section.html',
  styleUrl: './section.scss',
  host: { class: 'section', '[class.section--lead]': 'lead()' },
})
export class Section {
  /** The section's `h2`: "Photos". Without it the section has no head. */
  readonly heading = input<string>();
  /** The count beside the heading: "48 photos", "14". */
  readonly meta = input<string>();
  /** The route the head's link leads to. Without it there is no link. */
  readonly link = input<string | readonly unknown[]>();
  readonly linkText = input('See all');
  /** What the link leads to, read after its text: "photos" gives "See all photos". */
  readonly linkSuffix = input<string>();
  readonly lead = input(false);

  /** A space keeps the heading and the count apart as words. */
  protected readonly title = computed(() => (this.meta() ? `${this.heading()} ` : this.heading()));
  protected readonly suffix = computed(() => ` ${this.linkSuffix()}`);
}
