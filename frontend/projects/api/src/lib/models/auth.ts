/** The contact channel and code purpose as the API names them. */
export type ApiContactChannel = 'Phone' | 'Email';
export type CodePurpose = 'SignUp' | 'SignIn';

export interface RequestCodeRequest {
  purpose: CodePurpose;
  channel: ApiContactChannel;
  destination: string;
}

/** A code was sent: where to, masked, and when another may be asked for (L2-004 AC1, L2-005 AC1). */
export interface CodeSentView {
  verificationId: string;
  channel: ApiContactChannel;
  displayDestination: string;
  resendAvailableAt: string;
}

export interface SessionView {
  personId: string;
  name: string;
  photoUrl: string | null;
}

/** `NameRequired` when no account has the destination and no name was given (L2-006 AC2). */
export interface ConfirmCodeView {
  outcome: 'SignedIn' | 'NameRequired';
  session: SessionView | null;
  isNewPerson: boolean;
}
