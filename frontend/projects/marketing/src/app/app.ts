import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  Band,
  Button,
  Compare,
  CtaBand,
  Hero,
  Link,
  SiteFooter,
  SiteFooterLink,
  SiteMain,
  SiteNav,
  SiteNavLink,
  SkipLink,
  Steps,
  Use,
  Uses,
} from 'components';
import { APP_URL } from './app.config';
import { COMPARISON, IDEAS, PREVIEW, STEPS } from './content';

/**
 * The marketing site's one page (L2-079 to L2-081): the landing page's sections with the pitch
 * film after the hero. Every word is fixed copy; the page reads nothing.
 */
@Component({
  selector: 'pk-root',
  imports: [
    Band,
    Button,
    Compare,
    CtaBand,
    Hero,
    Link,
    SiteFooter,
    SiteFooterLink,
    SiteMain,
    SiteNav,
    SiteNavLink,
    SkipLink,
    Steps,
    Use,
    Uses,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
})
export class App {
  private readonly document = inject(DOCUMENT);
  private readonly appUrl = inject(APP_URL);

  protected readonly preview = PREVIEW;
  protected readonly steps = STEPS;
  protected readonly ideas = IDEAS;
  protected readonly comparison = COMPARISON;

  /** An address of the app, built from the one configured `APP_URL` (L2-081 AC2). */
  protected app(path: string): string {
    return `${this.appUrl}${path}`;
  }

  /**
   * "How it works", "Ideas" and "Watch the film": the section's heading comes into view and takes
   * focus (L2-080 AC4, L2-081 AC3), so a link chosen a second time moves it again. The address
   * still names the section, as the link's own fragment would.
   */
  protected jumpTo(event: Event, section: string): void {
    const heading = this.document.getElementById(`${section}-h`);
    if (!heading) return;
    event.preventDefault();
    this.document.defaultView?.history.pushState(null, '', `#${section}`);
    const still = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  }
}
