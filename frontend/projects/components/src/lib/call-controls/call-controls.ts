import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Call controls (docs/design-system/components/call-tile.html): Mute, Camera and Leave, at the
 * bottom of a call, each with its label under it at every width. Mute and Camera are toggle
 * buttons: pressed means the microphone or the camera is off, and a pressed control inverts its
 * fill and changes its icon and its label ("Unmute", "Camera off") (L2-030 AC5).
 *
 * It only shows and tells: the page turns the microphone and the camera off and on and gives
 * the controls the state that results.
 */
@Component({
  selector: 'div[pk-call-controls]',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './call-controls.html',
  styleUrl: './call-controls.scss',
  host: { class: 'call-controls' },
})
export class CallControls {
  /** The member's microphone is off. */
  readonly muted = input(false);
  /** The member's camera is off. */
  readonly cameraOff = input(false);

  readonly muteLabel = input('Mute');
  readonly unmuteLabel = input('Unmute');
  readonly cameraLabel = input('Camera');
  readonly cameraOffLabel = input('Camera off');
  /** The word under Leave. */
  readonly leaveLabel = input('Leave');
  /** What Leave does, its accessible name. */
  readonly leaveName = input('Leave call');

  /** Mute or Unmute was chosen. */
  readonly muteToggled = output<void>();
  /** Camera was chosen. */
  readonly cameraToggled = output<void>();
  /** Leave was chosen. */
  readonly left = output<void>();
}
