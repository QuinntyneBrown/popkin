import { Injectable, signal } from '@angular/core';
import { POPKIN_EMOJI, PopkinColour, PopkinLength } from '../../models/popkin';

export interface NewPopkinDraftState {
  name: string;
  emoji: string;
  colour: PopkinColour;
  length: PopkinLength;
  /** The end picked for "Until a date", as an ISO date-time. */
  customEndsAt: string | null;
}

const FIRST: NewPopkinDraftState = {
  name: '',
  emoji: POPKIN_EMOJI[0].emoji,
  colour: 'Coral',
  length: 'TheWeekend',
  customEndsAt: null,
};

/**
 * The two steps of starting a Popkin share this draft, so going back keeps every choice
 * (L2-008 AC5) and a failed create keeps them too (L2-009 AC5). Its first state is an empty name,
 * the first emoji and Coral (L2-008 AC6), and "The weekend" (L2-009 AC1).
 */
@Injectable({ providedIn: 'root' })
export class NewPopkinDraft {
  private readonly state = signal<NewPopkinDraftState>(FIRST);

  readonly draft = this.state.asReadonly();

  update(change: Partial<NewPopkinDraftState>): void {
    this.state.update((draft) => ({ ...draft, ...change }));
  }

  reset(): void {
    this.state.set(FIRST);
  }
}
