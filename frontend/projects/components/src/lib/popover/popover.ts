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

/**
 * Popover (docs/design-system/assets/components.css, `popover`): a small panel anchored under the
 * button that opens it, as "Hold a Popkin" with its search and its matches. The button is the
 * `[slot=trigger]` and sets `open`; the rest is the panel's content. It traps nothing: focus moves
 * to the panel's first field when it opens, Escape closes it and gives focus back to the button,
 * a press outside closes it, and ArrowDown from the field moves to the first option. `end` lines
 * it up with the button's end from 640 px.
 */
@Component({
  selector: 'div[pk-popover]',
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
  /** The panel's accessible name: "Hold a Popkin". */
  readonly label = input.required<string>();
  readonly open = model(false);
  readonly end = input(false);

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

  protected escape(event: Event): void {
    if (!this.open()) return;
    event.stopPropagation();
    this.open.set(false);
    this.host.querySelector<HTMLElement>('[slot=trigger]')?.focus();
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
