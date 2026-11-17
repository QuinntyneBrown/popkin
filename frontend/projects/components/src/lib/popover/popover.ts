import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  input,
  model,
} from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Popover (docs/design-system/components/popover.html): a small panel anchored under the button
 * that opens it, holding a search and a short list to pick from, as "Hold a Popkin" or "Mute
 * someone". The button is either the `[slot=trigger]` (which sets `open`), or, with `add`, the
 * dashed pill with a plus that the popover draws itself. It traps nothing: focus moves to the
 * panel's first field when it opens, Escape closes it and gives focus back to the button, a press
 * outside closes it, and ArrowDown from the field moves to the first option. `end` lines it up
 * with the button's end from 640 px. More than one field, or a consequence to confirm, is a
 * dialog instead.
 */
@Component({
  selector: 'div[pk-popover]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './popover.html',
  styleUrl: './popover.scss',
  host: {
    class: 'popover-anchor',
    '(keydown.escape)': 'escape($event)',
    '(document:click)': 'outside($event)',
  },
})
export class Popover {
  /** The panel's accessible name, and with `add` the button's words: "Mute someone". */
  readonly label = input.required<string>();
  readonly open = model(false);
  readonly end = input(false);
  /** Draws the dashed "+ {label}" button that opens the panel (the mocks' add button). */
  readonly add = input(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    const injector = inject(Injector);
    effect(() => {
      if (!this.open()) return;
      afterNextRender(
        () => this.host.querySelector<HTMLElement>('.popover input, .popover button')?.focus(),
        { injector },
      );
    });
  }

  protected toggle(): void {
    this.open.update((open) => !open);
  }

  /** Closes the panel and gives focus back to the button that opened it. */
  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.host.querySelector<HTMLElement>('.popover__trigger, [slot=trigger]')?.focus();
  }

  protected escape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.close();
  }

  protected outside(event: Event): void {
    if (this.open() && !this.host.contains(event.target as Node)) this.open.set(false);
  }

  /** ArrowDown from the field moves to the first option. */
  protected down(event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    const first = this.host.querySelector<HTMLElement>('.popover [role=option]');
    if (!first) return;
    event.preventDefault();
    first.focus();
  }
}
