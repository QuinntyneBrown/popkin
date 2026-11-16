import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Log form (docs/design-system/components/log-form.html): the one column of Log a conversation
 * or milestone, under its top bar: what to log, then each part of the entry, 24px apart.
 */
@Component({
  selector: 'form[pk-log-form]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './log-form.html',
  styleUrl: './log-form.scss',
  host: { class: 'log-form', novalidate: '' },
})
export class LogForm {}
