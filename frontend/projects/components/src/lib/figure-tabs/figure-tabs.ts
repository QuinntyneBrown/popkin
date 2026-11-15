import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface Figure<T extends string = string> {
  value: T;
  label: string;
  /** The number, already formatted: "48,210". */
  figure: string;
  /** What changed, such as "+312 joined today". */
  delta?: string;
}

/**
 * Figure tabs (docs/design-system/components/figures.html): the few numbers an admin checks first
 * on Dashboard and Metrics, each a tab that chooses the chart below (APG Tabs, `controls` naming
 * the chart's tabpanel). Tab moves onto the chosen figure; the arrow keys move and choose. They
 * stack under 640 px and sit side by side from 640 px.
 */
@Component({
  selector: 'div[pk-figure-tabs]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './figure-tabs.html',
  styleUrl: './figure-tabs.scss',
  host: {
    class: 'figure-tabs',
    role: 'tablist',
    '[attr.aria-label]': 'label()',
    '[style.--pk-figures]': 'figures().length',
  },
})
export class FigureTabs {
  readonly label = input.required<string>();
  readonly figures = input.required<Figure[]>();
  readonly value = model.required<string>();
  /** The id of the chart's tabpanel. */
  readonly controls = input.required<string>();

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected move(event: KeyboardEvent, index: number): void {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const figures = this.figures();
    const next = (index + step + figures.length) % figures.length;
    this.value.set(figures[next].value);
    this.buttons()[next].nativeElement.focus();
  }
}
