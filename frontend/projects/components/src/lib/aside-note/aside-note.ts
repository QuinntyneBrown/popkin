import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Aside note (docs/design-system/assets/components.css, `panel__aside-note`): a quiet sentence
 * under a panel that explains what the panel leaves out, as Holds' "Suspended and deleting
 * accounts are held automatically…". It keeps the mocks' class for the e2e locators.
 */
@Component({
  selector: 'p[pk-aside-note]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aside-note.html',
  styleUrl: './aside-note.scss',
  host: { class: 'panel__aside-note' },
})
export class AsideNote {}
