import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

/**
 * The first focusable element of every screen (L2-057 AC8). It moves focus to the main content
 * itself, because a bare fragment link would make the router leave the screen.
 */
@Component({
  selector: 'a[pk-skip-link]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './skip-link.html',
  styleUrl: './skip-link.scss',
  host: {
    class: 'skip-link',
    '[attr.href]': "'#' + target()",
    '(click)': 'skip($event)',
  },
})
export class SkipLink {
  /** The id of the element focus moves to. */
  readonly target = input('main');

  private readonly document = inject(DOCUMENT);

  protected skip(event: Event): void {
    event.preventDefault();
    this.document.getElementById(this.target())?.focus();
  }
}
