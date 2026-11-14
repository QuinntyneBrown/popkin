import { encodeQr } from 'api';
import type { CompareRow, FilmChapter, HeroPreview, StepView } from 'components';

/**
 * The marketing page's fixed copy (L2-079). The hero's preview, the steps, the ideas and the
 * comparison are the landing page's, word for word (L2-079 AC3); a change to them is made in
 * both pages and both mocks (ADR 0017). The pictures are copied into `public/images` from
 * docs/mocks/assets/images by `npm run media:sync`.
 */

/**
 * The pitch film "Meet Popkin" (L2-080), docs/videos/19-meet-popkin, copied into `public/media` by
 * `npm run media:sync`. Its narration is burned into the picture (AC5). The chapters are its
 * acts: the moment and the group chat (0:00), Popkin itself (0:16) and the send-off (1:08).
 */
export const FILM = {
  src: 'media/meet-popkin.mp4',
  // A picture of the mocks until a frame of the film replaces it.
  still: 'images/bonfire.jpg',
  label: 'Meet Popkin',
  playLabel: 'Play the Popkin film',
  length: '1:38',
  chapters: [
    { at: 0, time: '0:00', title: 'Getting everyone together' },
    { at: 16, time: '0:16', title: 'Meet Popkin' },
    { at: 68, time: '1:08', title: 'A proper send-off' },
  ] satisfies readonly FilmChapter[],
} as const;

export const PREVIEW: HeroPreview = {
  accent: 'teal',
  emoji: '🏕️',
  name: 'Lakeside Weekend',
  avatars: [
    { initials: '', accent: 'coral', photo: 'images/call1.jpg' },
    { initials: '', accent: 'leaf', photo: 'images/call2.jpg' },
    { initials: '', accent: 'sky', photo: 'images/call3.jpg' },
    { initials: '', accent: 'berry', photo: 'images/call4.jpg' },
  ],
  more: 10,
  members: '14 here',
  timeLeft: 'Wraps up Sunday',
  photos: ['images/lake.jpg', 'images/bonfire.jpg', 'images/hike.jpg'],
  messages: [
    { text: 'Canoes at 6:30? Sunrise is 6:52 🌅' },
    { text: 'I’m in. Bringing coffee.', mine: true },
  ],
  qr: { modules: encodeQr('https://popk.in/lakeside'), link: 'popk.in/lakeside' },
};

export const STEPS: readonly StepView[] = [
  {
    heading: 'Pop one up',
    text: 'Give it a name, an emoji and a colour. Pick how long it lasts. That’s the whole setup.',
  },
  {
    heading: 'Share the QR code',
    text: 'Hold up your phone, or drop the link in a text. Nobody needs your number.',
  },
  {
    heading: 'You’re together',
    text: 'Chat, share photos, plan things, hop on a call. When it’s done, wrap it up with a recap.',
  },
];

export const IDEAS = [
  {
    accent: 'amber',
    image: 'images/picnic.jpg',
    emoji: '🕯️',
    heading: 'Small group',
    text: 'The Thursday-night crew. Prayer requests, who’s bringing snacks, last week’s photos.',
    length: 'Keeps going',
  },
  {
    accent: 'sky',
    image: 'images/hackathon.jpg',
    emoji: '💻',
    heading: 'Hackathon',
    text: 'Everyone in the room, one scan away. Teams, demos and the 2 am pizza run.',
    length: 'One weekend',
  },
  {
    accent: 'leaf',
    image: 'images/soccer.jpg',
    emoji: '⚽',
    heading: 'Team',
    text: 'The parents on the touchline. Lifts, kit, orange slices, match-day pictures.',
    length: 'One season',
  },
  {
    accent: 'berry',
    image: 'images/beach.jpg',
    emoji: '🏖️',
    heading: 'Family trip',
    text: 'Three generations, one album. Grandparents included, no setup required.',
    length: 'Ten days',
  },
] as const;

export const COMPARISON: readonly CompareRow[] = [
  {
    label: 'Joining',
    theirs: 'Someone adds numbers one by one',
    ours: 'Scan a QR code, you’re in',
  },
  { label: 'Photos', theirs: 'Lost in the scroll', ours: 'A shared album the group keeps' },
  { label: 'Plans', theirs: 'Buried under replies', ours: 'Experiences everyone can rate' },
  { label: 'Video', theirs: 'Another app, another link', ours: 'One tap, whole group' },
  { label: 'The end', theirs: 'Muted forever', ours: 'A proper send-off and recap' },
];
