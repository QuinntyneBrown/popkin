import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ActionPair } from '../action-pair/action-pair';
import { MarkPicture, MarkPictureView } from '../mark-picture/mark-picture';
import { Wordmark } from '../wordmark/wordmark';

/**
 * Welcome (docs/design-system/components/welcome.html): the content of the welcome screen, the
 * first screen of the app for a visitor. The wordmark, the mark as a picture, the headline (the
 * screen's `h1`), a line under it, two actions of equal standing (`[slot=action]`, block
 * `a[pk-button]`s) and a link under them (`[slot=link]`, an `a[pk-link]`).
 *
 * Put it in a split `pk-screen` whose body is `middle`. Below 768 px the picture is in the
 * column and the actions are at the end of the screen; from 768 px the picture is the brand
 * aside's (`pk-split-aside` with `mark`), so this one is not rendered at all, and the column
 * sits in the middle of its part (L2-058 AC10, AC13).
 */
@Component({
  selector: 'div[pk-welcome]',
  imports: [ActionPair, MarkPicture, Wordmark],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
  host: { class: 'welcome' },
})
export class Welcome {
  /** The `h1` of the screen. */
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  readonly picture = input.required<MarkPictureView>();
}
