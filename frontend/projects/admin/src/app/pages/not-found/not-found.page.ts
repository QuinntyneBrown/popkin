import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminEntry, Button, EmptyState } from 'components';

/** An address the console has no page for (L2-089 AC5). */
@Component({
  selector: 'pk-not-found-page',
  imports: [AdminEntry, Button, EmptyState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {}
