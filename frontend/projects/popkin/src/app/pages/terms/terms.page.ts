import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Link, Logo, Prose, Screen, TopBar } from 'components';
import { LEGAL_UPDATED, TERMS } from '../legal-content';

/** The Terms, `/terms`: fixed copy, open to anyone, with no request (L2-083). */
@Component({
  selector: 'pk-terms-page',
  imports: [Link, Logo, Prose, RouterLink, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './terms.page.html',
})
export class TermsPage {
  protected readonly updated = LEGAL_UPDATED;
  protected readonly sections = TERMS;
}
