import { ApiContactChannel } from './auth';

/** The person's own account: what the account screen shows (L2-048 AC1). */
export interface AccountView {
  personId: string;
  name: string;
  photoUrl: string | null;
  channel: ApiContactChannel;
  /** The phone number as it was typed, "(415) 555-0148", or the email. */
  destination: string;
}

/** An active Popkin the person hosts, which wraps up when the account is deleted (L2-049 AC3). */
export interface HostedPopkinView {
  popkinId: string;
  name: string;
  emoji: string;
}

export interface DeletionImpactView {
  hostedActivePopkins: HostedPopkinView[];
}
