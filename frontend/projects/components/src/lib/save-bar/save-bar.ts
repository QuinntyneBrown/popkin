import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Button } from '../button/button';
import { Link } from '../link/link';

/**
 * Save bar (docs/design-system/components/limits.html, `save-bar`): holds unsaved edits. A
 * region named "Unsaved changes" that sticks to the foot of the viewport while there are changes
 * and rises in over `--duration-base` (at once under reduced motion). It says how many changes
 * there are, announced politely, with Discard and the save action, which wrap with the text.
 * Show it only while `count` is above 0. While a value is wrong, `blocked` says what to fix in
 * place of the count and the save action is off.
 */
@Component({
  selector: 'div[pk-save-bar]',
  imports: [Button, Link],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './save-bar.html',
  styleUrl: './save-bar.scss',
  host: { class: 'save-bar', role: 'region', 'aria-label': 'Unsaved changes' },
})
export class SaveBar {
  readonly count = input.required<number>();
  /** The save action, named for what it saves: "Save limits". */
  readonly saveLabel = input('Save');
  readonly busy = input(false);
  /** "Fix the highlighted default to save": said in place of the count, with save off. */
  readonly blocked = input<string | null>(null);

  readonly discard = output<void>();
  readonly save = output<void>();

  protected readonly text = computed(
    () =>
      this.blocked() ??
      (this.count() === 1 ? '1 unsaved change' : `${this.count()} unsaved changes`),
  );
}
