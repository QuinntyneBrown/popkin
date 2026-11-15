import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One fact of a record: its label and what an admin would read aloud. */
export interface KeyValue {
  label: string;
  value: string;
  /** An id, set in mono: "usr_mara7f3a91". */
  mono?: boolean;
}

/**
 * Key values (docs/design-system/components/key-values.html, `kv`): the facts of one record on
 * a detail page, as a description list. One column under 640 px; two from 640 px, or three with
 * `columns` 3; four from 1024 px with `columns` 4. Nothing in it can be pressed.
 */
@Component({
  selector: 'dl[pk-key-values]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './key-values.html',
  styleUrl: './key-values.scss',
  host: {
    class: 'kv',
    '[class.kv--3]': 'columns() === 3',
    '[class.kv--4]': 'columns() === 4',
  },
})
export class KeyValues {
  readonly items = input.required<readonly KeyValue[]>();
  readonly columns = input<2 | 3 | 4>(2);
}
