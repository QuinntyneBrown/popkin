import { Injectable, signal } from '@angular/core';
import { InvitePreviewView, JoinedView } from '../../models/invite';

/**
 * Carries an invite through the steps of joining: the preview from the invite screen to the
 * profile step, and the join's answer from there to the welcome. In memory only, and keyed by
 * the invite code, so one invite never shows another's Popkin.
 */
@Injectable({ providedIn: 'root' })
export class JoinInviteState {
  private readonly previews = signal<{ code: string; preview: InvitePreviewView } | null>(null);
  private readonly joins = signal<{ code: string; joined: JoinedView } | null>(null);

  preview(code: string): InvitePreviewView | null {
    const held = this.previews();
    return held?.code === code ? held.preview : null;
  }

  setPreview(code: string, preview: InvitePreviewView): void {
    this.previews.set({ code, preview });
  }

  joined(code: string): JoinedView | null {
    const held = this.joins();
    return held?.code === code ? held.joined : null;
  }

  setJoined(code: string, joined: JoinedView): void {
    this.joins.set({ code, joined });
  }
}
