import { AvatarView } from './invite';

/** A Popkin's group call under way (L2-029). */
export interface CallView {
  id: string;
  startedAt: string;
  /** Rises with every change of who is on the call; an event with an older one is dropped. */
  version: number;
  participantCount: number;
}

/** Someone on a call, as the API gives them: never a phone number or an email. */
export interface CallParticipantView {
  membershipId: string;
  firstName: string;
  name: string;
  avatar: AvatarView;
  micOn: boolean;
  cameraOn: boolean;
  /** Rises with every change of their microphone or camera. */
  mediaVersion: number;
  joinedAt: string;
}

/** A media relay the browser may use to reach the others (STUN or TURN). */
export interface IceServerView {
  urls: string[];
  username?: string | null;
  credential?: string | null;
}

/** What the API answers to starting or joining a call. */
export interface JoinedCallView {
  call: CallView;
  viewerMembershipId: string;
  /** Everyone on the call, the member included, in the order they joined. */
  participants: CallParticipantView[];
  iceServers: IceServerView[];
}

/** One step of setting up media between two people; the server relays it and never reads it. */
export interface CallSignal {
  type: 'offer' | 'answer' | 'candidate';
  payload: string;
}

/** Whether the member's microphone and camera are on. */
export interface CallMediaState {
  micOn: boolean;
  cameraOn: boolean;
}
