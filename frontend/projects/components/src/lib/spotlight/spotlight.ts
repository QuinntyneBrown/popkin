import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

export interface SpotlightFact {
  icon: IconName;
  /** The bold start: "She’s into". */
  lead: string;
  text: string;
}

/**
 * Spotlight (docs/design-system/components/spotlight.html): the one thing on Today that matters
 * most, a tinted card in the colour of its `data-accent`: when it is (`late` in the accent), the
 * person's avatar (`[slot=avatar]`) by a heading and a line, a few facts that help, and actions
 * (`[slot=actions]`, with `actions`). A keep strip goes in `[slot=strip]` (with `strip`). `row`
 * lays it out as a habit is: when, the heading and the line together, the actions beside them
 * from 768 px.
 */
@Component({
  selector: 'section[pk-spotlight]',
  imports: [Icon, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './spotlight.html',
  styleUrl: './spotlight.scss',
  host: {
    class: 'spotlight',
    '[class.spotlight--row]': 'row()',
    '[attr.aria-labelledby]': 'headingId()',
  },
})
export class Spotlight {
  readonly heading = input.required<string>();
  readonly headingId = input.required<string>();
  readonly sub = input<string>();
  /** When it is: "Saturday · in 4 days". */
  readonly when = input<string>();
  readonly whenIcon = input<IconName>('cake');
  readonly late = input(false);
  readonly facts = input<readonly SpotlightFact[]>([]);
  readonly actions = input(false);
  readonly strip = input(false);
  readonly row = input(false);
}
