import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

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
    '[class.avatar--lg]': "size() === 'lg'",
    '[class.avatar--xl]': "size() === 'xl'",
    'aria-hidden': 'true',
  },
})
export class Avatar {
  /** The person's name; the initials of its first and last word show when there is no photo. */
  readonly name = input.required<string>();
  readonly photo = input<string | null>();
  readonly size = input<'2xs' | 'xs' | 'sm' | 'base' | 'lg' | 'xl'>('base');

  protected readonly initials = computed(() => {
    const words = this.name().trim().split(/\s+/).filter(Boolean);
    const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
    return letters.map((word) => Array.from(word)[0].toUpperCase()).join('');
  });
}
