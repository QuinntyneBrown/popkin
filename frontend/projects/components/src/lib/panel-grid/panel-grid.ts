import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Panel grid (docs/design-system/components/panel.html): panels side by side from 1024 px; as
 * `list-detail`, a list of 380 px beside the chosen record. One column below 1024 px.
 */
@Component({
  selector: 'div[pk-panel-grid]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './panel-grid.html',
  styleUrl: './panel-grid.scss',
  host: { class: 'panel-grid', '[class.panel-grid--list-detail]': "layout() === 'list-detail'" },
})
export class PanelGrid {
  readonly layout = input<'list-detail'>('list-detail');
}
