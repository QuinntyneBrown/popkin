import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Avatar } from '../avatar/avatar';
import { IconButton } from '../icon-button/icon-button';

/**
 * Person pick (docs/design-system/components/form-sections.html, `person-pick`): a person chosen
 * in a form: their face, their name, how they connect ("Femi is her partner") and Remove, which
 * names the connection it removes ("Remove the connection to Grace").
 */
@Component({
  selector: 'div[pk-person-pick]',
  imports: [Avatar, IconButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './person-pick.html',
  styleUrl: './person-pick.scss',
  host: { class: 'person-pick' },
})
export class PersonPick {
  readonly name = input.required<string>();
  /** How they connect: "Femi is her partner". */
  readonly text = input<string>();
  readonly photo = input<string | null>();
  readonly initials = input<string>();
  /** The `data-accent` of their colour. */
  readonly accent = input.required<string>();

  readonly removed = output<void>();

  protected readonly firstName = computed(() => this.name().trim().split(/\s+/)[0] ?? '');
}
