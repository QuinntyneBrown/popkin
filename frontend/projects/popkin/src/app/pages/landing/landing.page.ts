import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Injector,
  afterNextRender,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { encodeQr } from 'api';
import {
  Band,
  Button,
  Compare,
  CompareRow,
  CtaBand,
  Hero,
  HeroPreview,
  SiteFooter,
  SiteFooterLink,
  SiteMain,
  SiteNav,
  SiteNavLink,
  StepView,
  Steps,
  Use,
  Uses,
} from 'components';

/**
 * The landing page (L2-001, L2-002): what Popkin is, in six sections, for a visitor. Every word
 * is fixed copy; the page reads nothing.
 */
@Component({
  selector: 'pk-landing-page',
  imports: [
    Band,
    Button,
    Compare,
    CtaBand,
    Hero,
    RouterLink,
    SiteFooter,
    SiteFooterLink,
    SiteMain,
    SiteNav,
    SiteNavLink,
    Steps,
    Use,
    Uses,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.page.html',
})
export class LandingPage {
  private readonly document = inject(DOCUMENT);

  constructor() {
    // An address that names a section opens on it (L2-002 AC5).
    const injector = inject(Injector);
    inject(ActivatedRoute)
      .fragment.pipe(takeUntilDestroyed())
      .subscribe((fragment) => {
        if (fragment) afterNextRender(() => this.jumpTo(fragment), { injector });
      });
  }

  /**
   * "How it works" and "Ideas": the section comes into view and its heading takes focus
   * (L2-002 AC5). The links call this too, so one chosen a second time jumps again.
   */
  protected jumpTo(section: string): void {
    const heading = this.document.getElementById(`${section}-h`);
    if (!heading) return;
    const still = this.document.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  }

  protected readonly preview: HeroPreview = {
    accent: 'teal',
    emoji: '🏕️',
    name: 'Lakeside Weekend',
    avatars: [
      { initials: '', accent: 'coral', photo: '/images/call1.jpg' },
      { initials: '', accent: 'leaf', photo: '/images/call2.jpg' },
      { initials: '', accent: 'sky', photo: '/images/call3.jpg' },
      { initials: '', accent: 'berry', photo: '/images/call4.jpg' },
    ],
    more: 10,
    members: '14 here',
    timeLeft: 'Wraps up Sunday',
    photos: ['/images/lake.jpg', '/images/bonfire.jpg', '/images/hike.jpg'],
    messages: [
      { text: 'Canoes at 6:30? Sunrise is 6:52 🌅' },
      { text: 'I’m in. Bringing coffee.', mine: true },
    ],
    qr: { modules: encodeQr('https://popk.in/lakeside'), link: 'popk.in/lakeside' },
  };

  protected readonly steps: readonly StepView[] = [
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

  protected readonly ideas = [
    {
      accent: 'amber',
      image: '/images/picnic.jpg',
      emoji: '🕯️',
      heading: 'Small group',
      text: 'The Thursday-night crew. Prayer requests, who’s bringing snacks, last week’s photos.',
      length: 'Keeps going',
    },
    {
      accent: 'sky',
      image: '/images/hackathon.jpg',
      emoji: '💻',
      heading: 'Hackathon',
      text: 'Everyone in the room, one scan away. Teams, demos and the 2 am pizza run.',
      length: 'One weekend',
    },
    {
      accent: 'leaf',
      image: '/images/soccer.jpg',
      emoji: '⚽',
      heading: 'Team',
      text: 'The parents on the touchline. Lifts, kit, orange slices, match-day pictures.',
      length: 'One season',
    },
    {
      accent: 'berry',
      image: '/images/beach.jpg',
      emoji: '🏖️',
      heading: 'Family trip',
      text: 'Three generations, one album. Grandparents included, no setup required.',
      length: 'Ten days',
    },
  ];

  protected readonly comparison: readonly CompareRow[] = [
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
}
