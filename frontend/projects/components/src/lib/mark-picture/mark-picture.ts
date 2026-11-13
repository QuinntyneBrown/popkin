import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextId = 0;

/** The two photographs of the mark as a picture, and what they show, in words. */
export interface MarkPictureView {
  /** The photograph in the bubble: the group. */
  group: string;
  /** The photograph in the dot: the one more person. */
  person: string;
  /** What the picture shows, for assistive technology. */
  label: string;
}

/**
 * The mark as a picture (docs/design-system/components/welcome.html): the Popkin mark with a
 * photograph of a group in its bubble and of one more person in its dot. It is an image with a
 * name. It takes the width it is given; the screen that shows it sets that.
 */
@Component({
  selector: 'svg[pk-mark-picture]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mark-picture.html',
  styleUrl: './mark-picture.scss',
  host: {
    class: 'mark-picture',
    viewBox: '0 0 64 64',
    role: 'img',
    '[attr.aria-label]': 'picture().label',
  },
})
export class MarkPicture {
  readonly picture = input.required<MarkPictureView>();

  private readonly id = ++nextId;
  protected readonly bubbleId = `mark-picture-bubble-${this.id}`;
  protected readonly dotId = `mark-picture-dot-${this.id}`;
}
