import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Plan header (docs/design-system/components/schedule.html): the head of a tab with views,
 * such as Schedule. It names the tab (the screen's `h1`) under its views, and holds the tab's
 * actions beside the name from 640 px.
 *
 * Slots: `[slot=views]` holds the `pk-view-nav`; the default slot holds the actions, each a
 * `pk-button`.
 */
@Component({
  selector: 'header[pk-plan-header]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './plan-header.html',
  styleUrl: './plan-header.scss',
  host: { class: 'plan-header' },
})
export class PlanHeader {
  readonly heading = input.required<string>();
  /** A line under the name: "Sep 12 – 18 · everyone’s working hours". */
  readonly sub = input<string>();
  /** The end of the line under the name, in bold: "14 days left". */
  readonly subStrong = input<string>();
}
