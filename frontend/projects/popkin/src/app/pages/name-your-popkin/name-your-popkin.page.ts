import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  NewPopkinDraft,
  POPKIN_COLOURS,
  POPKIN_EMOJI,
  PopkinColour,
  SessionStore,
  accentOf,
} from 'api';
import {
  Button,
  ColourPicker,
  EmojiPicker,
  NamePreview,
  PreviewCard,
  Screen,
  SplitAside,
  TopBar,
} from 'components';

/** The first step of starting a Popkin: its name, emoji and colour (L2-008). */
@Component({
  selector: 'pk-name-your-popkin-page',
  imports: [
    Button,
    ColourPicker,
    EmojiPicker,
    NamePreview,
    PreviewCard,
    ReactiveFormsModule,
    Screen,
    SplitAside,
    TopBar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './name-your-popkin.page.html',
})
export class NameYourPopkinPage implements OnInit {
  private readonly store = inject(NewPopkinDraft);
  private readonly router = inject(Router);

  protected readonly emoji = POPKIN_EMOJI;
  protected readonly colours = POPKIN_COLOURS;
  protected readonly draft = this.store.draft;
  /** The person naming it: its Host, shown on the preview card. */
  protected readonly host = inject(SessionStore).session;
  protected readonly name = new FormControl(this.draft().name, { nonNullable: true });
  protected readonly accent = computed(() => accentOf(this.draft().colour));
  protected readonly ready = computed(() => this.draft().name.trim().length > 0);

  constructor() {
    this.name.valueChanges.subscribe((name) => this.store.update({ name }));
  }

  /**
   * `?crew=`: the wrapped-up Popkin whose members get this one's invite (L2-046 AC5). It is
   * kept through Back from the second step, and dropped when a Popkin is started any other way.
   */
  readonly crew = input<string>();
  private readonly cameBack =
    this.router.lastSuccessfulNavigation()?.finalUrl?.toString().startsWith('/new/length') ?? false;

  ngOnInit(): void {
    const crew = this.crew();
    if (crew) this.store.update({ crewOf: crew });
    else if (!this.cameBack) this.store.update({ crewOf: null });
  }

  protected chooseEmoji(emoji: string): void {
    this.store.update({ emoji });
  }

  protected chooseColour(colour: string): void {
    this.store.update({ colour: colour as PopkinColour });
  }

  protected next(): void {
    if (this.ready()) void this.router.navigateByUrl('/new/length');
  }
}
