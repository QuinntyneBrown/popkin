import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** A paragraph, as a string, or a bulleted list, as its items. */
export type ProseBlock = string | readonly string[];

/** A section of prose: its `h2` and what follows it. */
export interface ProseSection {
  readonly heading: string;
  readonly blocks: readonly ProseBlock[];
}

/**
 * Prose (docs/design-system/assets/components.css, `.prose`): the text of the Terms and the
 * Privacy notice (L2-082, L2-083). Each section is an `h2` and its paragraphs and lists, read as
 * text, never as HTML. The default slot follows the sections, ruled off: the link to the other
 * page.
 */
@Component({
  selector: 'article[pk-prose]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './prose.html',
  styleUrl: './prose.scss',
  host: { class: 'prose' },
})
export class Prose {
  readonly sections = input.required<readonly ProseSection[]>();

  protected isList(block: ProseBlock): block is readonly string[] {
    return Array.isArray(block);
  }
}
