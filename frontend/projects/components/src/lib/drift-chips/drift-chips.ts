import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PersonAvatar } from '../avatar/avatar';
import { WhoChip } from '../who-chip/who-chip';

/** Someone not talked to in a while, as a chip that opens Log. */
export interface DriftChip {
  face: PersonAvatar;
  /** "Sam · 59 days". */
  label: string;
  link: string | readonly unknown[];
}

/**
 * The link form of the who chip (`pk-who-chip`) (docs/design-system/components/chip.html, `who-chip`), for
 * "It's been a while" on Today: each chip opens Log a conversation with that person
 * (L2-125 AC7).
 */
@Component({
  selector: 'div[pk-drift-chips]',
  imports: [RouterLink, WhoChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './drift-chips.html',
  styleUrl: './drift-chips.scss',
  host: { class: 'drift-chips' },
})
export class DriftChips {
  readonly people = input.required<readonly DriftChip[]>();
}
