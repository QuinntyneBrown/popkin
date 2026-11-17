import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Where a cluster's parts sit along the row. */
export type ClusterJustify = 'start' | 'center' | 'between';

/**
 * Cluster (docs/design-system/foundations/layout.html, Stack and cluster): its children in a
 * wrapping row, 8px apart and centred across. `center` centres them along the row; `between`
 * pushes its ends apart and does not wrap, unless `wrap` lets the far end drop to a line of its
 * own when the row does not fit, such as a profile's filters and its log buttons on a phone. It carries the layout utility's class and modifier,
 * so a page sets the alignment with a knob, not a class (ADR 0029).
 */
@Component({
  selector: 'div[pk-cluster], p[pk-cluster]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cluster.html',
  styleUrl: './cluster.scss',
  host: {
    class: 'cluster',
    '[class.cluster--center]': "justify() === 'center'",
    '[class.cluster--between]': "justify() === 'between'",
    '[class.cluster--wrap]': 'wrap()',
  },
})
export class Cluster {
  readonly justify = input<ClusterJustify>('start');
  /** Wrap even when `between`: the parts drop to a new line rather than squeeze. */
  readonly wrap = input(false);
}
