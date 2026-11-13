import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

/** What draws a person's avatar where a component is given the person: a message, a list. */
export interface PersonAvatar {
  initials: string;
  /** The `data-accent` of the person's colour. */
  accent: string;
  photoUrl: string | null;
}

/**
 * Avatar (docs/design-system/components/avatar.html): a person's photograph, or their initials
 * on their colour. Decoration: the name beside it names the person. Set `data-accent` on it or
 * an ancestor.
 */
@Component({
  selector: 'span[pk-avatar]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  host: {
    class: 'avatar',
    '[class.avatar--2xs]': "size() === '2xs'",
    '[class.avatar--xs]': "size() === 'xs'",
    '[class.avatar--sm]': "size() === 'sm'",
    '[class.avatar--36]': "size() === '36'",
    '[class.avatar--lg]': "size() === 'lg'",
    '[class.avatar--xl]': "size() === 'xl'",
    '[class.avatar--2xl]': "size() === '2xl'",
    '[class.avatar--ring]': 'ring()',
    '[class.avatar--blank]': 'blank()',
    'aria-hidden': 'true',
  },
})
export class Avatar {
  /** The person's name; the initials of its first and last word show when there is no photo. */
  readonly name = input('');
  /** The initials as the API gives them, where the name itself is not known (an invite). */
  readonly initials = input<string>();
  readonly photo = input<string | null>();
  /** `36` is the 36 px avatar of a short row, as the design system names it. */
  readonly size = input<'2xs' | 'xs' | 'sm' | '36' | 'base' | 'lg' | 'xl' | '2xl'>('base');
  /** A ring in the canvas colour, for avatars that overlap or sit on a picture. */
  readonly ring = input(false);
  /** No colour yet: the person has not joined, as in the photo picker. */
  readonly blank = input(false);

  /** A photo the browser cannot show gives way to the initials. */
  protected readonly failed = signal(false);

  protected readonly letters = computed(() => {
    const given = this.initials();
    if (given !== undefined) return given;
    const words = this.name().trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
    return letters.map((word) => Array.from(word)[0].toUpperCase()).join('');
  });

  constructor() {
    effect(() => {
      this.photo();
      this.failed.set(false);
    });
  }
}
