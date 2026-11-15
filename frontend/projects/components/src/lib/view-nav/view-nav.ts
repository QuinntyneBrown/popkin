import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** One view of a tab: its words, where it goes, and whether it is the one shown. */
export interface ViewLink {
  label: string;
  link: string;
  current: boolean;
}

/**
 * View nav (docs/design-system/components/view-nav.html): the views of one tab, such as "Time
 * off" and "This week" of Schedule. Links, the one shown marked `aria-current="page"`; the row
 * scrolls sideways when it does not fit.
 */
@Component({
  selector: 'nav[pk-view-nav]',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './view-nav.html',
  styleUrl: './view-nav.scss',
  host: { class: 'view-nav', 'aria-label': 'Views' },
})
export class ViewNav {
  readonly views = input.required<ViewLink[]>();
}
