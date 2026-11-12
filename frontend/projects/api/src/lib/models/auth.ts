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
