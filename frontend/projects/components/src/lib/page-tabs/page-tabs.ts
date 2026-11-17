import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Page tabs (docs/design-system/components/tabs.html): the tabs that switch a page between its
 * views, under its head, as Notifications' "Kinds", "Holds" and "Defaults". It spaces a
 * `pk-segmented-control` of kind `tabs` (set `scroll`) from what is above and below it.
 */
@Component({
  selector: 'div[pk-page-tabs]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-tabs.html',
  styleUrl: './page-tabs.scss',
  host: { class: 'page-tabs' },
})
export class PageTabs {}
