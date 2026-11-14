import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Link, Logo, Prose, Screen, TopBar } from 'components';
import { LEGAL_UPDATED, PRIVACY } from '../legal-content';

/** The Privacy notice, `/privacy`: fixed copy, open to anyone, with no request (L2-082). */
@Component({
  selector: 'pk-privacy-page',
  imports: [Link, Logo, Prose, RouterLink, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './privacy.page.html',
})
export class PrivacyPage {
  protected readonly updated = LEGAL_UPDATED;
  protected readonly sections = PRIVACY;
}
