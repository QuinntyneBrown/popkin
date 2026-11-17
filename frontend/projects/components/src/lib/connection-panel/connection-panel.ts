import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { IconButton } from '../icon-button/icon-button';

/** The face chosen on the map, as the panel names it. */
export interface ConnectionPanelPerson {
  name: string;
  /** How the person knows them: "Brother". */
  sub: string;
  initials?: string;
  photo?: string | null;
  /** The `data-accent` of their colour. */
  accent: string;
}

let next = 0;

/**
 * Connection panel (docs/design-system/components/connection-map.html, the aside): beside the
 * map, with no face chosen a dashed card says how to use it and what the lines mean (L2-149 AC2);
 * with one chosen it names them and how the person knows them, with "Clear the focus", then
 * their connections (`[slot=list]`) and the actions (`[slot=actions]`) (L2-149 AC3).
 */
@Component({
  selector: 'aside[pk-connection-panel]',
  imports: [Avatar, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-panel.html',
  styleUrl: './connection-panel.scss',
  host: {
    class: 'connection-panel',
    '[class.connection-panel--hint]': '!person()',
    '[attr.aria-labelledby]': 'headingId',
  },
})
export class ConnectionPanel {
  readonly person = input<ConnectionPanelPerson | null>(null);
  /** The hint's heading and legend with no face chosen. */
  readonly hint = input.required<string>();
  readonly legend = input.required<string>();
  /** "Clear the focus". */
  readonly cleared = output<void>();

  protected readonly headingId = `connection-panel-${++next}`;
}
