import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** The legal line under the sign-up action: continuing accepts the Terms and Privacy (L2-003 AC7). */
@Component({
  selector: 'p[pk-legal]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './legal.html',
  styleUrl: './legal.scss',
  host: { class: 'legal' },
})
export class Legal {
  readonly termsLink = input('/terms');
  readonly privacyLink = input('/privacy');
}
