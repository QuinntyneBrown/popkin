import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * The small line under a screen's main action. By default it is the legal line of sign up:
 * continuing accepts the Terms and Privacy (L2-003 AC7). With `note` it says that instead, such
 * as "No app to download." under Join.
 */
@Component({
  selector: 'p[pk-legal]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
  host: { class: 'legal', '[class.legal--note]': '!!note()' },
})
export class Legal {
  readonly termsLink = input('/terms');
  readonly privacyLink = input('/privacy');
  readonly note = input<string>();
}
