import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ICONS, IconName, IconShape } from './icons';

/** An outline icon, decoration only: its meaning is carried by the text or name beside it. */
@Component({
  selector: 'svg[pk-icon]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: {
    class: 'icon',
    '[class.icon--sm]': "size() === 'sm'",
    '[class.icon--md]': "size() === 'md'",
    '[class.icon--lg]': "size() === 'lg'",
    '[class.icon--xl]': "size() === 'xl'",
    'aria-hidden': 'true',
    viewBox: '0 0 24 24',
  },
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input<'sm' | 'md' | 'lg' | 'xl' | 'base'>('base');

  protected readonly shapes = computed<IconShape[]>(() => ICONS[this.name()]);
}
