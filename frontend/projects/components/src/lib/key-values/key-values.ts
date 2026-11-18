import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface KeyValue {
  term: string;
  value: string;
}

/**
 * Key values (docs/design-system/components/key-values.html): figures as a description list, one
 * column on a phone and two from 640 px.
 */
@Component({
  selector: 'dl[pk-key-values]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './key-values.html',
  styleUrl: './key-values.scss',
  host: { class: 'kv' },
})
export class KeyValues {
  readonly items = input.required<readonly KeyValue[]>();
}
