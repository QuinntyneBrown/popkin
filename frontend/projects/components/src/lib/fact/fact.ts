import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Icon } from '../icon/icon';
import { IconName } from '../icon/icons';

/**
 * Fact (docs/design-system/components/list-row.html, `fact`): one thing that will happen, as a
 * row of `ul[pk-facts]`: an icon on a tile, what happens (`heading`) and a line about it
 * (`text`). "Everyone gets a recap" on the wrap-up screen.
 */
@Component({
  selector: 'li[pk-fact]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fact.html',
  styleUrl: './fact.scss',
  host: { class: 'fact' },
})
export class Fact {
  readonly icon = input.required<IconName>();
  readonly heading = input.required<string>();
  readonly text = input<string>();
}
