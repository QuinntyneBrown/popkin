import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Link key (docs/design-system/components/connection-map.html): a short bar in the colour of a
 * kind of link, before its word in the map's key ("Family", "Friends", "Work"). Decoration: the
 * word says the kind.
 */
@Component({
  selector: 'span[pk-link-key]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './link-key.html',
  styleUrl: './link-key.scss',
  host: {
    class: 'link-key',
    'aria-hidden': 'true',
    '[class.link-key--family]': "kind() === 'family'",
    '[class.link-key--partner]': "kind() === 'partner'",
    '[class.link-key--friend]': "kind() === 'friend'",
  },
})
export class LinkKey {
  /** `work` keeps the subtle grey. */
  readonly kind = input.required<'family' | 'partner' | 'friend' | 'work'>();
}
