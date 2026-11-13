import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { StackAvatar } from '../avatar-stack/avatar-stack';
import { Pop } from '../pop/pop';

/**
 * Arrival (docs/mocks/pages/youre-in): the welcome of a new member. The people already in
 * stand in a circle around the Popkin's tile, which pops with its confetti; under it the
 * screen's `h1` and one line. The circle is decoration: the line says who is there.
 */
@Component({
  selector: 'div[pk-arrival]',
  imports: [Avatar, Pop],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './arrival.html',
  styleUrl: './arrival.scss',
  host: { class: 'arrival' },
})
export class Arrival {
  readonly emoji = input.required<string>();
  readonly heading = input.required<string>();
  readonly lead = input<string>();
  /** The people around the tile, from the top, clockwise. Six read best. */
  readonly avatars = input<readonly StackAvatar[]>([]);

  /** Each avatar's place on the circle, as percentages of its box. */
  protected readonly placed = computed(() => {
    const avatars = this.avatars();
    return avatars.map((avatar, i) => {
      const angle = (i * 2 * Math.PI) / avatars.length;
      return {
        avatar,
        left: 50 + 40 * Math.sin(angle),
        top: 50 - 40 * Math.cos(angle),
      };
    });
  });
}
