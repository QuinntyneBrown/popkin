import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Scanner (docs/design-system/components/scanner.html): the camera's view in the Scan to join
 * dialog. A dark square that shows the `stream` it is given, a frame to hold a QR code in, and
 * one line of words. While `busy` (a code was found) the camera's view is gone, a spinner takes
 * the frame's place and the scanner is a `status`, so its words are announced.
 *
 * It only shows. The dialog asks for the camera, gives the scanner its `stream`, and reads codes
 * from the `<video>` that `videoReady` hands it.
 */
@Component({
  selector: 'div[pk-scanner]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scanner.html',
  styleUrl: './scanner.scss',
  host: {
    class: 'scanner',
    '[class.scanner--busy]': 'busy()',
    '[attr.role]': "busy() ? 'status' : null",
  },
})
export class Scanner {
  /** What to do, or what is happening: "Hold the QR code inside the frame". */
  readonly hint = input.required<string>();
  /** A code was found and its invite is opening. */
  readonly busy = input(false);
  /** What the camera sees. Without it the scanner is the dark square alone. */
  readonly stream = input<MediaStream | null>(null);

  /** The `<video>` that plays the stream, once it is in the page, to read codes from. */
  readonly videoReady = output<HTMLVideoElement>();

  private readonly video = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    afterNextRender(() => this.videoReady.emit(this.video().nativeElement));
  }
}
