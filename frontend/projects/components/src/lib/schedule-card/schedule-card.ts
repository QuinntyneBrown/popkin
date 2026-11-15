import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The home's Schedule card (docs/design-system/components/card.html, `card--link`): one line
 * that names the next evening everyone is free, or says none is (L2-075 AC2). The whole card is
 * one link to this week: set `routerLink` on it. It is set in from the sides of its section.
 */
@Component({
  selector: 'a[pk-schedule-card]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './schedule-card.html',
  styleUrl: './schedule-card.scss',
  host: { class: 'card card--link' },
})
export class ScheduleCard {
  /** "Everyone’s free Wednesday from 7:30 pm". */
  readonly line = input.required<string>();
}
