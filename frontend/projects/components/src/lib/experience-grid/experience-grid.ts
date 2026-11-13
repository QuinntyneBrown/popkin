import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The grid of Experiences (docs/design-system/components/card.html, `exp-grid`): a list of
 * `li[pk-experience-card]`. One card across on a phone, two from 640 px, three from 1024 px and
 * four from 1280 px, each as tall as its row (L2-058 AC7).
 */
@Component({
  selector: 'ul[pk-experience-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './experience-grid.html',
  styleUrl: './experience-grid.scss',
  host: { class: 'exp-grid' },
})
export class ExperienceGrid {}
