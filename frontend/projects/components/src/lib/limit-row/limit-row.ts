import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * One field of a limit row: a text field, or a select when it has `options`. A field without a
 * `label` is named by its row; with one, by the label ("Quiet hours start").
 */
export interface LimitField {
  key: string;
  value: string;
  label?: string;
  numeric?: boolean;
  invalid?: boolean;
  options?: readonly { value: string; label: string }[];
}

/** A field changed: its key and its new value. */
export interface LimitFieldChange {
  key: string;
  value: string;
}

/**
 * Limit row (docs/design-system/components/limits.html, `limit`): one limit or default, its name,
 * its help and its value. The value is its `fields` — one or two text fields joined by `joiner`
 * ("21:00 to 08:00"), or a select — with a unit word after them ("minutes"), or a projected
 * control such as `pk-segmented-control` named by `nameId`. The fields follow the text field's
 * states: focus, invalid with `error`, read-only for an admin who may not change them.
 */
@Component({
  selector: 'div[pk-limit-row]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './limit-row.html',
  styleUrl: './limit-row.scss',
  host: { class: 'limit' },
})
export class LimitRow {
  /** The row's id; its name, help, error and fields take ids from it. */
  readonly fieldId = input.required<string>();
  /** "Bundle changes within". */
  readonly name = input.required<string>();
  /** "Changes inside this window ride in one email." */
  readonly help = input<string>();
  /** A word after the fields: "minutes". */
  readonly unit = input<string>();
  readonly fields = input<readonly LimitField[]>([]);
  /** The word between two fields. */
  readonly joiner = input('to');
  readonly error = input<string | null>(null);
  /** The fields can be read but not changed. */
  readonly readonly = input(false);

  /** Every change the admin makes. */
  readonly changed = output<LimitFieldChange>();

  /** The id of the name, for a projected control's `aria-labelledby`. */
  readonly nameId = computed(() => `${this.fieldId()}-name`);

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.fieldId()}-err` : this.help() ? `${this.fieldId()}-help` : null,
  );

  protected idOf(index: number): string {
    return index === 0 ? this.fieldId() : `${this.fieldId()}-${index + 1}`;
  }

  protected invalid(field: LimitField): boolean {
    return !!this.error() && (field.invalid ?? true);
  }

  protected input(key: string, event: Event): void {
    this.changed.emit({ key, value: (event.target as HTMLInputElement | HTMLSelectElement).value });
  }
}
