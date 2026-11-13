import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A top-level page (docs/design-system/components/screen.html, `screen--page`): Your Popkins. It
 * is as wide as the window, up to the page maximum, under a brand bar (`pk-top-bar`) that is
 * ruled off from 768 px. It owns the `main` landmark the skip link moves to and the page's `h1`,
 * which grows with the window. The document scrolls; nothing inside the page does.
 *
 * Slots: `[slot=header]`, `[slot=banner]` (a `pk-banner` between the bar and `main`), the
 * default slot inside `main` under the heading, and `[slot=fab]`, the floating action of a phone
 * (a `pk-fab`), which is absent from 768 px, where the bar holds the same action (L2-058 AC9).
 */
@Component({
  selector: 'div[pk-page-screen]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-screen.html',
  styleUrl: './page-screen.scss',
  host: { class: 'screen screen--page', '[attr.data-accent]': 'accent()' },
})
export class PageScreen {
  /** The colour the page carries; the app's own pages are Coral. */
  readonly accent = input<string>('coral');
  /** The `h1` of the page: "Your Popkins". */
  readonly heading = input.required<string>();
}
