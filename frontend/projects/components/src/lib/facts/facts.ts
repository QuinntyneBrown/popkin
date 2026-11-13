import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Facts (docs/design-system/components/list-row.html, `facts`): the list of what happens next,
 * one `li[pk-fact]` each. Nothing in it can be pressed.
 */
@Component({
  selector: 'ul[pk-facts]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './facts.html',
  styleUrl: './facts.scss',
  host: { class: 'facts' },
})
export class Facts {}
