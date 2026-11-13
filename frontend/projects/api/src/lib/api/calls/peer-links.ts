import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { CallSignal, IceServerView } from '../../models/calls';

/**
 * The media between the member and each other person on a call: one link per person (a mesh),
 * set up by exchanging signals that `CallSession` carries through the hub. The media itself
 * goes from browser to browser and never through Popkin's API.
 */
export interface PeerLinks {
  /** A signal to carry to one person. Every one must arrive; none is dropped or merged. */
  readonly signal$: Observable<{ to: string; signal: CallSignal }>;
  /** Someone's camera and microphone arrived. */
  readonly stream$: Observable<{ membershipId: string; stream: MediaStream }>;
  /** The link to someone broke and did not come back by itself. */
  readonly lost$: Observable<string>;
  /** Begins a call: what the member sends, and the relays the links may use. */
  open(viewerMembershipId: string, local: MediaStream, iceServers: IceServerView[]): void;
  /** Offers a link to someone on the call; the one who arrives offers to those already there. */
  connect(membershipId: string): void;
  /** Takes a signal someone sent. An offer from someone new makes their link. */
  receive(fromMembershipId: string, signal: CallSignal): void;
  /** Closes the link to someone who left. */
  drop(membershipId: string): void;
  /** Ends the call: closes every link. */
  close(): void;
}

export const PEER_LINKS = new InjectionToken<PeerLinks>('PeerLinks');
