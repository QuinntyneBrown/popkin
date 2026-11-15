import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { Avatar } from '../avatar/avatar';

export interface MapPerson {
  id: string;
  /** The full name, the face's accessible name. */
  name: string;
  /** The name under the face: "Ada". */
  firstName: string;
  /** Where the face sits, as fractions of the map's width and height (0 to 1). */
  x: number;
  y: number;
  /** The `data-accent` of the person's colour. */
  accent: string;
  photo: string | null;
}

/** A line as `connectionMapOf` in the `api` library works it out, in a 1000 × 680 box. */
export interface MapLine {
  key: string;
  kind: 'family' | 'partner' | 'friend' | 'work';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  pending: boolean;
  on: boolean;
  dim: boolean;
}

/**
 * Connection map (docs/design-system/components/connection-map.html): who a member knows and how
 * they know each other, faces on a field with "You" in the middle and a line for each link,
 * coloured by its kind (pair with `pk-link-key`); a pending link is dotted. Each face is a toggle
 * (`aria-pressed`): choosing one sets `focus`, lights their links and dims the rest
 * (`connectionMapOf` works out `lines` and `dim`); choosing it again lets go. The lines are hidden
 * from assistive technology; the page lists the same links in words.
 */
@Component({
  selector: 'div[pk-connection-map]',
  imports: [Avatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './connection-map.html',
  styleUrl: './connection-map.scss',
  host: { class: 'connection-map', role: 'group', '[attr.aria-label]': 'label()' },
})
export class ConnectionMap {
  readonly label = input('Map of your connections');
  readonly people = input.required<readonly MapPerson[]>();
  readonly lines = input.required<readonly MapLine[]>();
  /** The people dimmed while someone is chosen. */
  readonly dim = input<ReadonlySet<string>>(new Set());
  /** Your own photo and colour, in the middle. */
  readonly youPhoto = input<string | null>(null);
  readonly youAccent = input('coral');
  readonly focus = model<string | null>(null);

  protected choose(id: string): void {
    this.focus.set(this.focus() === id ? null : id);
  }
}
