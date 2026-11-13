import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Closing band (docs/design-system/components/cta-band.html): the last word of the landing page
 * on the brand colour, a heading and a paragraph with the main action beside them from 992 px.
 * Project the action, an `a[pk-button]` of the `on-accent` variant; `note` is the line under it.
 */
@Component({
  selector: 'div[pk-cta-band]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cta-band.html',
  styleUrl: './cta-band.scss',
  host: { class: 'cta-band' },
})
export class CtaBand {
  /** The band's `h2`. */
  readonly heading = input.required<string>();
  /** The id of the `h2`, for the section around the band to be named by it. */
  readonly headingId = input<string>();
  readonly text = input.required<string>();
  /** The line under the action. */
  readonly note = input<string>();
}
