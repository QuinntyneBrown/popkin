import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { POPKINS_API, accentOf, matchesMember } from 'api';
import { DialogFrame, MemberPicker } from 'components';
import { catchError, map, of } from 'rxjs';

export interface NewMessageData {
  popkinId: string;
  popkinName: string;
  accent: string;
}

/**
 * "New message" (L2-022 AC4): the Popkin's members other than the member, with a search that
 * ignores case and accents. Choosing one closes the dialog with their membership id; the page
 * that opened it opens the direct message.
 */
@Component({
  selector: 'pk-new-message-dialog',
  imports: [DialogFrame, MemberPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './new-message.dialog.html',
})
export class NewMessageDialog {
  protected readonly data = inject<NewMessageData>(DIALOG_DATA);
  protected readonly ref = inject<DialogRef<string>>(DialogRef);

  private readonly members = toSignal(
    inject(POPKINS_API)
      .getMembers(this.data.popkinId)
      .pipe(
        map((members) => members.filter((member) => !member.isViewer)),
        // A list that cannot be read is an empty one: the dialog says nobody is found.
        catchError(() => of([])),
      ),
    { initialValue: [] },
  );

  protected readonly query = signal('');
  protected readonly matches = computed(() =>
    this.members()
      .filter((member) => matchesMember(member.displayName, this.query()))
      .map((member) => ({
        key: member.membershipId,
        name: member.displayName,
        avatar: {
          initials: member.avatar.initials,
          accent: accentOf(member.avatar.accent),
          photoUrl: member.avatar.photoUrl,
        },
      })),
  );
}
