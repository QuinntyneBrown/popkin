import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { FieldLabel } from '../field-label/field-label';
import { WhoChip } from '../who-chip/who-chip';

/** A member as "Who’s on it?" offers them: their first name and avatar. */
export interface WhoChipMember {
  id: string;
  name: string;
  initials: string;
  photo: string | null;
  accent: string;
}

/**
 * Who chips (docs/design-system/components/plan.html, `who-chip`): who is on a story, nobody or
 * one member, each member a toggle with their avatar and first name (L2-069 AC1, AC2). Choosing
 * the member who is on it again clears the choice; with nobody chosen, the hint says anyone can
 * pick it up. The chosen chip says so with `aria-pressed` and its outline.
 */
@Component({
  selector: 'div[pk-who-chips]',
  imports: [FieldLabel, WhoChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './who-chips.html',
  styleUrl: './who-chips.scss',
})
export class WhoChips {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly members = input.required<readonly WhoChipMember[]>();
  /** The member on it, or null for nobody. */
  readonly value = model.required<string | null>();
  /** What shows while nobody is chosen. */
  readonly none = input<string>();
  readonly disabled = input(false);

  protected readonly labelId = computed(() => `${this.fieldId()}-l`);

  protected toggle(id: string): void {
    if (this.disabled()) return;
    this.value.set(this.value() === id ? null : id);
  }
}
