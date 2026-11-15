import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  input,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../icon/icon';
import { PopkinTile } from '../popkin-tile/popkin-tile';

/** A group in the list: its tile, its name and its members. */
export interface GroupItem {
  id: string;
  /** The group's emoji, on its tile. */
  emoji: string;
  /** The `data-accent` of its colour. */
  accent: string;
  name: string;
  /** "Walt, Ellie, Ruth, Joel". */
  members: string;
  link: string | readonly unknown[];
}

/** The groups of one kind: "Households", "Small groups", "Teams". */
export interface GroupKind {
  kind: string;
  groups: readonly GroupItem[];
}

/** The open group's head. */
export interface OpenGroup {
  /** Its kind, over the name: "Small group". */
  kind: string;
  name: string;
  emoji: string;
  accent: string;
}

/**
 * Group browser (docs/design-system/components/group-browser.html, `group-browser`): the groups
 * by kind beside the open one. The list is a `nav` named "Your groups", each kind a heading and
 * the open item `aria-current`, shown by an edge as well as the fill. The open group is a
 * section named by it: its tile, kind and name, its actions (`[slot=actions]`, such as the way
 * into its Popkin) and its parts (the default slot), side by side from XL. From L the list sits
 * beside the open group; below L one or the other shows: the list, or with `detail` the group,
 * with a back link to the list, and opening it moves focus to its name.
 */
@Component({
  selector: 'div[pk-group-browser]',
  imports: [Icon, PopkinTile, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './group-browser.html',
  styleUrl: './group-browser.scss',
  host: { class: 'group-browser', '[class.group-browser--detail]': 'detail()' },
})
export class GroupBrowser {
  readonly kinds = input.required<readonly GroupKind[]>();
  /** The id of the open group. */
  readonly currentId = input<string | null>(null);
  readonly open = input<OpenGroup | null>(null);
  /** Below L, show the open group instead of the list. */
  readonly detail = input(false);
  /** Where the back link above the open group leads below L: the list. */
  readonly backLink = input<string | readonly unknown[]>();
  readonly backLabel = input('Groups');

  private readonly name = viewChild<ElementRef<HTMLElement>>('name');

  constructor() {
    afterRenderEffect(() => {
      const element = this.name()?.nativeElement;
      if (!element || !this.detail()) return;
      untracked(() => {
        // On a phone the list has gone; the name is where the person now is.
        if (globalThis.matchMedia?.('(max-width: 63.99rem)').matches) element.focus();
      });
    });
  }
}
