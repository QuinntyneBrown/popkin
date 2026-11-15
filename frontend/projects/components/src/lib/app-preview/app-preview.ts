import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Wordmark } from '../wordmark/wordmark';

/**
 * Announcement preview (docs/design-system/components/announcement-preview.html): a sketch of the
 * app's home with the announcement on top, beside its form on Announcements, so an admin sees how
 * it will look. The announcement is its content: a `pk-banner` with only `text` and
 * `dismissMark`, `loud` for an outage. It is a picture only: hidden from assistive technology and
 * inert, since the form already says everything it shows.
 */
@Component({
  selector: 'div[pk-app-preview]',
  imports: [Wordmark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-preview.html',
  styleUrl: './app-preview.scss',
  host: { class: 'app-preview', 'aria-hidden': 'true', inert: '' },
})
export class AppPreview {
  protected readonly rows = [1, 2, 3];
}
