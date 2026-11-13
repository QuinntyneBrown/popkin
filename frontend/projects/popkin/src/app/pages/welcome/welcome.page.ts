import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, Link, MarkPictureView, Screen, SplitAside, Welcome } from 'components';

/**
 * The welcome screen: the same choices as the landing page on one screen, with "Join with a
 * code". It is where a person lands after signing out.
 */
@Component({
  selector: 'pk-welcome-page',
  imports: [Button, Link, RouterLink, Screen, SplitAside, Welcome],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './welcome.page.html',
})
export class WelcomePage {
  protected readonly picture: MarkPictureView = {
    group: '/images/bonfire.jpg',
    person: '/images/call1.jpg',
    label: 'A group around a bonfire, and one more person popping in',
  };
}
