import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, EmptyState, Logo, Screen, TopBar } from 'components';

/** An address that matches no screen (L2-056 AC5). */
@Component({
  selector: 'pk-not-found-page',
  imports: [Button, EmptyState, Logo, RouterLink, Screen, TopBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './not-found.page.html',
})
export class NotFoundPage {}
