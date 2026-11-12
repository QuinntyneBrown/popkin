import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Placeholder for the first screen; it goes when the first journey is implemented. */
@Component({
  selector: 'pk-home-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home.page.html',
})
export class HomePage {}
