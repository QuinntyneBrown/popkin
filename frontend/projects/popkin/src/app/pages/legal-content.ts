import type { ProseSection } from 'components';

/**
 * The fixed copy of the Terms (L2-083) and the Privacy notice (L2-082), word for word the mocks'
 * (docs/mocks/pages/terms, docs/mocks/pages/privacy). `<TO SUPPLY: …>` marks a fact only the
 * owner can give (known gap 78).
 */
export const LEGAL_UPDATED = 'Last updated 14 November 2026';

export const PRIVACY: readonly ProseSection[] = [
  {
    heading: 'Who we are',
    blocks: [
      'Popkin is run by <TO SUPPLY: legal name of who runs Popkin>. This notice says what Popkin keeps about you, what it is used for, who handles it for Popkin, and how to have it erased.',
    ],
  },
  {
    heading: 'What we collect',
    blocks: [
      [
        'Your name and the photo you choose. Members of your Popkins see them.',
        'The phone number or email you sign in with. Other members never see it.',
        'What you share in a Popkin: messages, photos, comments, reactions, experiences and ratings.',
        'The devices you are signed in on, so that you stay signed in.',
      ],
      'Popkin shows no ads and never sells your personal data.',
    ],
  },
  {
    heading: 'How we use your phone number',
    blocks: [
      'Your phone number is used only to send you one-time sign-in codes and group invites.',
      'Mobile numbers and SMS opt-in data are never sold, and never shared with third parties or affiliates for marketing or promotional purposes.',
      'Reply STOP to any text to stop them, or HELP for help. The Terms say more.',
    ],
  },
  {
    heading: 'Who handles it for us',
    blocks: [
      'Sign-in codes and invites are sent through Azure Communication Services, by text or by email. Photos and other files are kept in Azure Blob Storage.',
      'Both are run by Microsoft, which handles your data on Popkin’s behalf.',
    ],
  },
  {
    heading: 'Who sees what',
    blocks: [
      'What you share in a Popkin is seen by its members only. A direct message is seen by its two members only.',
      'When a Popkin wraps up it becomes read-only. Its Host chooses whether to keep the photo album; if it is not kept, its photos are removed after 30 days.',
    ],
  },
  {
    heading: 'Delete your account',
    blocks: [
      'Open Your account and choose “Delete my account”. You are signed out at once, any Popkin you host is wrapped up, and your personal data is erased within 30 days.',
      'Your messages and photos in Popkins stay, without your name.',
    ],
  },
  {
    heading: 'Contact',
    blocks: [
      'To ask about your data, or to have it corrected or erased, write to <TO SUPPLY: contact email>.',
    ],
  },
];

export const TERMS: readonly ProseSection[] = [
  {
    heading: 'Who we are',
    blocks: [
      'Popkin is run by <TO SUPPLY: legal name of who runs Popkin> (“we”). These Terms are the agreement between you and us. By signing up you accept them and the Privacy notice.',
    ],
  },
  {
    heading: 'Your account',
    blocks: [
      'You sign up with your name and a phone number or email, and sign in with a code we send to it. There is no password.',
      'Keep the phone or email you sign in with to yourself: anyone who can read its codes can sign in as you.',
    ],
  },
  {
    heading: 'What you share',
    blocks: [
      'What you share in a Popkin stays yours. You let us store it and show it to the members of that Popkin, so that Popkin works.',
      'Share only what you have the right to share, and nothing unlawful, hateful or meant to harm or harass anyone.',
      'A Popkin’s Host can remove photos from its album, and we may remove what breaks these Terms.',
    ],
  },
  {
    heading: 'Text messages (SMS)',
    blocks: [
      'Popkin texts you only when you ask for a sign-in code, one text each time, plus occasional group invites. Texts come from Popkin’s number, +1 833-245-2473.',
      'Message and data rates may apply.',
      'Reply STOP to stop the texts. Reply HELP for help.',
      'Carriers are not liable for delayed or undelivered messages.',
    ],
  },
  {
    heading: 'Paying',
    blocks: [
      'We may charge for Popkin, or for parts of it, in future. Before anything is charged you will be shown the price and asked to agree to it. Nothing is ever charged without your agreement.',
    ],
  },
  {
    heading: 'Ending',
    blocks: [
      'You can delete your account at any time from Your account. Your personal data is then erased within 30 days, as the Privacy notice says.',
      'We may suspend or close an account that breaks these Terms.',
    ],
  },
  {
    heading: 'Changes',
    blocks: [
      'When these Terms change, the date at the top changes too. If you keep using Popkin after a change, you accept the new Terms.',
    ],
  },
  {
    heading: 'The law',
    blocks: [
      'These Terms are governed by the law of <TO SUPPLY: governing law>.',
      'Popkin is provided as it is. Nothing in these Terms limits the rights you have by law.',
    ],
  },
  { heading: 'Contact', blocks: ['Questions about these Terms: <TO SUPPLY: contact email>.'] },
];
