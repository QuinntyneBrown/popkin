import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** How far apart a stack's parts are: 12px, 16px or 24px. */
export type StackGap = 'sm' | 'md' | 'lg';

/**
 * Stack (docs/design-system/foundations/layout.html, Stack and cluster): its children in a
 * column, `gap` apart. It carries the layout utility's class and modifier, so a page sets the
 * spacing with a knob, not a class (ADR 0029).
 */
@Component({
  selector: 'div[pk-stack], ul[pk-stack], form[pk-stack], section[pk-stack]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stack.html',
  styleUrl: './stack.scss',
  host: {
    class: 'stack',
    '[class.stack--sm]': "gap() === 'sm'",
    '[class.stack--lg]': "gap() === 'lg'",
  },
})
export class Stack {
  readonly gap = input<StackGap>('md');
}
