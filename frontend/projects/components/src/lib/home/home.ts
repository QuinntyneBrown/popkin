import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Skeleton } from '../skeleton/skeleton';

/**
 * The layout of the Popkin home (docs/design-system/components/home-header.html, `home`): its
 * sections in one column on a phone; from 768 px the sections of the side part sit two abreast
 * under the main part, and from 1024 px the main part and the side part are two columns
 * (L2-058 AC11). It goes in a `flush` body of the app screen.
 *
 * While `loading` it is the skeleton of the home: a card, a strip of photos and a card. It is
 * hidden from assistive technology; the header's status line says what is loading.
 *
 * Slots: the default slot is the main part (chat, photos); `[slot=side]` is the side part
 * (experiences, members).
 */
@Component({
  selector: 'div[pk-home]',
  imports: [Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.html',
  styleUrl: './home.scss',
  host: {
    '[class.home]': '!loading()',
    '[class.home-skeleton]': 'loading()',
    '[attr.aria-hidden]': "loading() ? 'true' : null",
  },
})
export class Home {
  /** The skeleton of the home, in place of its sections. */
  readonly loading = input(false);
}
