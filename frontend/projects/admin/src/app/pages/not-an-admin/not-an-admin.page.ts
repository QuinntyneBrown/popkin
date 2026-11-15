import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminEntry, Button, EmptyState } from 'components';
import { environment } from '../../../environments/environment';

/** A code that was right but is not an admin's (L2-078 AC2): Popkin is still theirs to use. */
@Component({
  selector: 'pk-not-an-admin-page',
  imports: [AdminEntry, Button, EmptyState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-an-admin.page.html',
})
export class NotAnAdminPage {
  protected readonly popkinAppUrl = environment.popkinAppUrl;
}
