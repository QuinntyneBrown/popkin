# Popkin design system

Extracted from [docs/mocks](../mocks/README.md) on 12 November 2026. Open [index.html](index.html) in a browser, straight from disk.
The mocks were built from the Popkin Community Platform designs; this system is what they have in common, written down once.

## Foundations

| Page | Covers |
|---|---|
| [Color](foundations/color.html) | Primitives, roles, status colours, both themes, live contrast pairs |
| [Typography](foundations/typography.html) | Nunito, Inter, Rubik; the type roles |
| [Spacing](foundations/spacing.html) | The 4px scale and how to use it |
| [Layout](foundations/layout.html) | Breakpoints, the app's form factors, the landing grid, screen templates |
| [Elevation](foundations/elevation.html) | Three shadows, surfaces, z-order |
| [Shape](foundations/shape.html) | Radii and borders |
| [Motion](foundations/motion.html) | Durations, easing, the pop, reduced motion |
| [Iconography](foundations/iconography.html) | Lucide icons in use, sizes, labelling |
| [Theming](foundations/theming.html) | Light and dark, the Popkin colour, adding a theme, tokens.json |
| [Responsive](foundations/responsive.html) | Per-component behaviour by width, touch, testing |
| [Accessibility](foundations/accessibility.html) | The WCAG 2.2 AA commitments and testing |
| [Content](foundations/content.html) | Voice, rules, numbers, errors, microcopy |

## Components

| Component | Group | Variants | States | Source mocks |
|---|---|---|---|---|
| [Button](components/button.html) | Actions | Primary, Popkin, secondary, ghost, quiet, danger. On colour: the white button on a coral band. Floating action | Default, Hover, Focus, Active, Disabled, Busy | pages/welcome/default, pages/how-long/submitting, pages/wrap-up/default |
| [Icon button](components/icon-button.html) | Actions | Plain, filled (sand), on a card (over a photo), Popkin coloured, send. On the stage (calls and photos) the hov | Default, Hover, Focus, Active, Disabled | pages/popkin-home/default, pages/group-chat/default, pages/experience-detail/default |
| [Link](components/link.html) | Actions | Inline: underlined. Text button: no underline, 44px tall, centred under a primary. Section link: "See all" at  | Default, Hover, Focus, Disabled | pages/welcome/default, pages/sign-up/default, pages/popkin-home/default |
| [Text field](components/text-field.html) | Inputs | Default with help. Code: large, spaced digits for the six-digit code. Display: the Popkin name inside its prev | Default, Focus, Invalid, Read-only, Disabled | pages/sign-up/invalid, pages/verify-code/default, pages/name-your-popkin/default |
| [Textarea](components/textarea.html) | Inputs | With help. | Default, Focus, Invalid, Read-only | dialogs/add-comment/default, dialogs/add-comment/invalid |
| [Form summary](components/form-summary.html) | Inputs | One error. Several errors. | Static (both themes) | pages/sign-up/invalid, pages/account/invalid, dialogs/share-experience/invalid |
| [Segmented control](components/segmented-control.html) | Inputs | Tabs: switches the field below (sign up). Radio group: a setting (theme). | Default, Hover, Focus | pages/sign-up/default, pages/account/default |
| [Switch](components/switch.html) | Inputs | On. Off. | On, Off, Focus, Disabled | pages/wrap-up/default, pages/wrap-up/album-off |
| [Choice card](components/choice-card.html) | Inputs | A group of choice cards. | Unchosen, Chosen, Focus | pages/how-long/default, dialogs/change-length/default |
| [Emoji picker](components/emoji-picker.html) | Inputs | The twelve emoji. | Default, Chosen, Focus | pages/name-your-popkin/default, dialogs/edit-popkin/default |
| [Colour picker](components/colour-picker.html) | Inputs | Coral, Teal, Sky, Berry, Leaf, Plum, Amber. | Default, Chosen, Focus | pages/name-your-popkin/default |
| [Photo picker](components/photo-picker.html) | Inputs | Without and with a photo. | Default, Focus, With photo | pages/your-profile/default, pages/your-profile/with-photo, pages/account/default |
| [Logo](components/logo.html) | Identity | Logo, coral wordmark, app icon 64px and 40px. | Static (both themes) | pages/brand-components/default, pages/landing/default, pages/welcome/default |
| [Avatar](components/avatar.html) | Identity | Photo, initials, initials; a stack of four with +10. | Static (both themes) | pages/popkin-home/default, pages/conversations/default, pages/youre-in/default |
| [Popkin tile](components/popkin-tile.html) | Identity | Active in Teal, Amber, Leaf; wrapped up (muted). | Static (both themes) | pages/my-popkins/default, pages/join-invite/wrapped |
| [Time left](components/time-left.html) | Identity | In three Popkin colours. | Static (both themes) | pages/popkin-home/default, pages/my-popkins/default |
| [Badge](components/badge.html) | Identity | Coral count, Popkin count, word, quiet word, unread dot. | Static (both themes) | pages/my-popkins/default, pages/conversations/default, pages/popkin-home/default |
| [Chip](components/chip.html) | Identity | Filter chips. Suggestion chips. Tag and pill. | Default, Pressed, Hover, Focus | pages/photo-album/default, pages/experiences/default, pages/group-chat/empty |
| [Card](components/card.html) | Content | Popkin card: tinted, tile, name, latest message, members, time left. Experience card: 16:9 picture with a tag, | Default, Hover, Focus | pages/my-popkins/default, pages/experiences/default, pages/experience-detail/default |
| [List row](components/list-row.html) | Content | Two direct messages, one unread. Short row: members. Menu rows in an action sheet; the destructive one is cora | Default, Hover, Focus | pages/conversations/default, pages/my-popkins/default, dialogs/popkin-settings/default |
| [Rating](components/rating.html) | Content | Inline score and stars. Your rating: five 48px star buttons. Score card. | None, Chosen (5), Focus | pages/experience-detail/default, pages/experience-detail/rated, pages/experiences/default |
| [Stat](components/stat.html) | Content | A pair. | Static (both themes) | pages/wrapped-up/default |
| [Recap](components/recap.html) | Content | The collage. No photos. The people row. | Static (both themes) | pages/wrapped-up/default, pages/wrapped-up/plain |
| [Message](components/message.html) | Chat | Divider, system note, theirs with reactions, yours with a reply quote. Photo message; a message that did not s | Not reacted, Reacted (yours), Focus | pages/group-chat/default, pages/direct-message/default, pages/group-chat/failed-send |
| [Composer](components/composer.html) | Chat | Replying to Ruth. Closed: a wrapped-up Popkin. | Empty, With text, Focus | pages/group-chat/default, pages/group-chat/read-only |
| [Photo grid](components/photo-grid.html) | Media | Saturday, featured. Strip on the home. | Default, Focus, Uploading | pages/photo-album/default, pages/popkin-home/default, dialogs/add-photos/busy |
| [Photo viewer](components/photo-viewer.html) | Media | Reactions and the react bar. | Default, Pressed, Focus | pages/photo-view/default |
| [Upload row](components/upload-item.html) | Media | Ready, with and without a caption. Near the limit, with a count. | Invalid, Uploading, Added, Failed | dialogs/add-photos/default, dialogs/add-photos/invalid, dialogs/add-photos/busy, dialogs/add-photos/failed |
| [QR card](components/qr-card.html) | Media | With the name. Without the name (just created). Large, in the aside of the created screen. | Static (both themes) | pages/popkin-created/default, dialogs/invite/default |
| [Scanner](components/scanner.html) | Media | One: the camera view with its frame and hint. | Scanning, Busy, Invalid, Denied (both themes) | dialogs/scan-to-join/default, dialogs/scan-to-join/busy, dialogs/scan-to-join/invalid, dialogs/scan-to-join/denied |
| [Call tile and controls](components/call-tile.html) | Media | Speaking, muted, camera off. Controls: Mute, Camera (off, pressed), Leave. | Static (both themes) | pages/video-call/default, pages/video-call/muted, pages/video-call/two |
| [Top bar](components/top-bar.html) | Navigation | Onboarding: back and step dots. Thread: tile, title, subline, call. Root: logo and actions. | Static (both themes) | pages/sign-up/default, pages/group-chat/default, pages/my-popkins/default |
| [Popkin tabs](components/popkin-nav.html) | Navigation | Chat is current. | Static (both themes) | pages/popkin-home/default, pages/conversations/default |
| [Home header](components/home-header.html) | Layout | A Popkin with an end date. A Popkin with one member. A section head with a count and a link, and with a count alone. | Static (both themes); loading | pages/popkin-home/default, pages/popkin-home/loading, pages/popkin-home/empty |
| [Skip link](components/skip-link.html) | Navigation | Shown as it looks when focused. | Static (both themes) | pages/landing/default |
| [Site header and footer](components/site-navigation.html) | Navigation | Header at 768px and wider. Footer. | Static (both themes) | pages/landing/default |
| [Hero](components/hero.html) | Layout | Text over the preview. Text beside the preview from 992px. | Static (both themes) | pages/landing/default |
| [Band and section](components/band.html) | Layout | On the canvas. Surface band, ruled off. Sand band. Narrow. Head with the lead beside the heading. | Static (both themes) | pages/landing/default |
| [Steps](components/steps.html) | Data display | Three numbered steps. | Static (both themes) | pages/landing/default |
| [Idea cards](components/uses.html) | Data display | One card per Popkin colour. | Static (both themes) | pages/landing/default |
| [Comparison table](components/compare.html) | Data display | Group chat beside Popkin. | Static (both themes) | pages/landing/default |
| [Closing band](components/cta-band.html) | Layout | Heading, paragraph and the white button on coral. | Static (both themes) | pages/landing/default |
| [Film](components/film.html) | Media | The pitch film: a still with a play button and its length, the film with its controls, and its chapters. | Static (both themes) | pages/marketing-home/default, pages/marketing-home/playing |
| [Welcome](components/welcome.html) | Layout | Picture in the column (phone). Picture in the brand aside (from 768px). | Static (both themes) | pages/welcome/default |
| [Action pair](components/action-pair.html) | Actions | Stacked. Side by side. | Static (both themes) | pages/welcome/default |
| [Dialog and sheet](components/dialog.html) | Overlays | Confirmation: danger and a safe default. Form. | Default, Busy, Invalid, Failed | dialogs/invite/default, dialogs/leave-popkin/default, dialogs/edit-popkin/invalid |
| [Toast](components/toast.html) | Overlays | Success, info, warning, danger. | Static (both themes) | notifications/toast/success, notifications/toast/stacked |
| [Banner](components/banner.html) | Overlays | Popkin (call), success, warning, danger. | Static (both themes) | notifications/banner/info, notifications/banner/warning, notifications/banner/danger |
| [Alert](components/alert.html) | Overlays | Danger, warning, info. | Static (both themes) | pages/sign-up/error, pages/how-long/error, dialogs/delete-account/default |
| [Tooltip](components/tooltip.html) | Overlays | Hover to see the browser tooltip. | Static (both themes) | pages/my-popkins/default |
| [Skeleton](components/skeleton.html) | Feedback | A Popkin card loading. Media, bubble, button. | Static (both themes) | pages/my-popkins/loading, pages/popkin-home/loading, pages/group-chat/loading |
| [Empty state](components/empty-state.html) | Feedback | First use. Filtered to nothing. Error, with a reference code for server errors. | Static (both themes) | pages/photo-album/empty, pages/experiences/no-results, pages/not-found/default |
| [Progress and spinner](components/progress.html) | Feedback | Determinate bar. Spinner on the stage. | Static (both themes) | dialogs/add-photos/busy, pages/video-call/loading |
| [Status note](components/status-note.html) | Feedback | Success. | Static (both themes) | pages/account/success |
| [Screen and layout](components/screen.html) | Layout | A step screen. Stack (16px vertical) and cluster (8px wrapping row). Washed screen. Split screen. | Static (both themes) | pages/how-long/default, pages/join-invite/default, pages/sign-up/default, pages/popkin-created/default |
| [Split aside](components/split-aside.html) | Layout | Photograph with a caption. Tint with a preview card. Tint with an icon, a title, a timeline and text. | Static (both themes) | pages/sign-up/default, pages/name-your-popkin/default, pages/how-long/default |
| [Panes](components/panes.html) | Layout | List pane beside a thread. Thread pane beside the list. Detail pane: the Popkin, or the other member of a direct message with the photos shared between you. | Static (both themes) | pages/conversations/default, pages/direct-message/default, pages/group-chat/default |
| [Preview card](components/preview-card.html) | Identity | With a name. No name yet. A 40-character name. | Static (both themes) | pages/name-your-popkin/default, pages/name-your-popkin/blank, pages/name-your-popkin/edge |
| [Timeline](components/timeline.html) | Content | Day, weekend, custom, forever. | Static (both themes) | pages/how-long/default, pages/how-long/custom, pages/how-long/forever |

Added with the Trips, Schedules and admin mocks on 13 November 2026, in `assets/components.css`
and not yet given a page of their own (the next run of `extracting-design-systems` writes them):
view switch (`.view-nav`), plan header (`.plan-header`), sprint chip and sparkline
(`.sprint-chip`, `.sparkline`), board and story card (`.board`, `.story-card`, `.pts-group`,
`.who-chip`), burn-down chart and legend (`.burn`, `.burn-chart`, `.chart-legend`, `.biggest`),
month and week pickers (`.month-nav`, `.weeks`), the time-off table (`.table-wrap`, `.leave`),
the day picker and shift timeline (`.day-picker`, `.free`, `.shifts`), the hours and leave rows
of the dialogs (`.hours-row`, `.leave-row`), the panel dialog (`.dialog--panel`) and the admin
app's feature row and mark (`.feature-row`, `.topbar__app`). The Popkin tabs now take four or six
tabs.

Not built, because no screen needs them yet: dropdown menu (Popkin settings is a sheet with menu rows), select, checkbox, radio buttons (choice cards and the segmented control cover the choices),
side navigation, breadcrumb, pagination and table. Add one from the extracting-design-systems catalog when a mock first needs it.

### In the components library

The `pk-*` components in `frontend/projects/components` carry these blocks, one stylesheet each
(ADR 0007). A few blocks the mocks draw inside a larger block became components of their own, or
gained a part, as journey 1 built them; `assets/components.css` records the additions:

- `step-dots` is `pk-step-dots`, composed by `pk-top-bar`.
- The display text field and its `preview-row` are `pk-name-preview`, with the `field__count`
  right-aligned (it was floated, which a flex column ignores).
- `date-btn` is `pk-date-button`; `share-actions` and `share-action` are `pk-share-actions` and
  `pk-share-action`; the `pop` celebration is `pk-pop`, which hides its confetti under reduced
  motion.
- `screen` gains `screen__body--hero`, `screen__lead`, `screen__content--headed` and
  `screen__actions` (the mocks' `push`), and `icon` gains `icon--xl` (the empty state's icon).
- `.qr` carries its own white padding, the quiet zone a camera needs.

## Patterns

| Pattern | Covers |
|---|---|
| [Forms](patterns/forms.html) | Popkin asks for very little: a name, a way to reach you, a code. Each step is one screen with one question and one action at the thumb. |
| [Feedback and loading](patterns/feedback-and-loading.html) | Every press answers within 100ms; waits show the shape of what is coming; outcomes are confirmed where people are looking. |
| [Empty and error states](patterns/empty-and-error-states.html) | An empty place says what it is for and offers the first step. A failure keeps the chrome, says nothing was lost and offers Try again. |
| [Navigation](patterns/navigation.html) | Inside a Popkin, four tabs at the bottom. Everywhere else, a top bar with Back. My Popkins is home; the landing page is for visitors. |
| [Dialogs and overlays](patterns/dialogs-and-overlays.html) | Short tasks open in a sheet over the screen they belong to. Under 640px it rises from the bottom; wider, it is a centred card. |
| [Lists and media](patterns/lists-and-media.html) | Popkin has no tables. Its lists are cards, rows and photo grids, newest first, loading more as you scroll. |
| [Notifications](patterns/notifications.html) | Toasts for outcomes, banners for conditions, counts where people look. Nothing nags. |
| [Content and tone](patterns/content-and-tone.html) | Short, human, a little cheeky. The words carry as much of Popkin's warmth as the colour does. |
| [Popkin colour](patterns/popkin-colour.html) | Each Popkin picks one of seven colours. Its screens, main buttons, bubbles, badges and tabs take that colour, for everyone in it. |

## Tokens

- `tokens/tokens.css`: the source of truth. Primitives (`--palette-*`), roles (`--color-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`, `--layout-*` …) with light and dark values, and the Popkin colour (`--accent*`, set with `data-accent`).
- `tokens/tokens.json`: the DTCG export, generated from `tokens.css` (347 tokens).
- `tokens/contrast-pairs.json`: the 75 foreground and background pairs the components rely on, checked in both themes.
- `assets/components.css`: every component class, tokens only. `assets/fonts/`: Nunito, Inter and Rubik (SIL Open Font License).
- `assets/ds.css`, `assets/ds.js`: the documentation chrome; not product UI.

## Drift found in the mocks

| Mock | Issue | Resolution |
|---|---|---|
| `assets/ui.css` (all mocks) | 12 raw colours: white and black veils on the stage, scrims, the quote in your own bubble, the toast hover | Named tokens: `--color-bg-stage-control`, `-subtle`, `-strong`, `--color-bg-stage-label`, `--color-bg-scrim`, `--color-bg-scrim-subtle`, `--color-bg-quote-on-popkin`, `--color-bg-inverse-hover` |
| `assets/ui.css` | Components used primitives directly (`--palette-white`, `--palette-ink`, `--palette-sun`) | `--color-constant-light`, `--color-constant-dark`, `--color-confetti-*`, `--color-danger-solid-hover` |
| `assets/ui.css` | Toast icon colours overridden per theme inside the component | `--color-inverse-success-icon`, `-warning-icon`, `-danger-icon`, set per theme in tokens |
| All mocks | Seven radii (6, 12, 16, 22, 26, 32px, full) and a 28% app icon | Five radii plus full and the tile: 22 and 26px merged at 24px (`--radius-lg`), 32px is `--radius-xl`, the app icon uses `--radius-tile` |
| All mocks | Font sizes named by value (`--font-size-13`, `-15`, `-17`) | `--font-size-sm-plus`, `-md-minus`, `-md-plus` |
| `assets/ui.css` | One-off sizes (17.5rem, 12.5rem, 9rem, 13rem, 6.5rem, 27.5rem) and measure widths (18, 20, 22, 24, 26, 30, 32rem) | `--layout-polaroids-*`, `--layout-qr-size*`, `--layout-hero-art-max`, `--layout-measure-xs/sm/md/lg`, `--layout-toast-max`; 22rem snapped to 24rem, 32rem to the 34rem measure |
| Dark theme, Berry and Plum Popkins | The Popkin colour as an edge or icon fell to 2.5 to 2.9:1 on dark cards | `--accent-line`, the colour lightened 35% toward white in dark |
| Dark theme, design-system docs | Popkin tints did not follow a theme set on a wrapper | Derived accent tokens are recomputed on `[data-theme]` as well as `[data-accent]` |
| `pages/conversations`, `pages/popkin-home`, `pages/wrapped-up` | `card--link` combined with `cluster` lost its flex layout | `.card--row` |
| `dialogs/*` without a description | No gap between title and body | The body always starts 16px under the header |
| `pages/brand-components` | A `btn--ghost` class that did not exist | Ghost is the base `.btn`; the brand-sheet-only classes moved to the mocks' `mock.css` |
| Design (Magic Patterns) | Faint text #8a8090 (3.6:1), hairline field and switch edges (1.3:1), future step dots (1.3:1) | Already corrected in the mocks; recorded as `--color-fg-subtle`, `--color-border-strong`, and `--palette-ink-muted` for disabled text only |
| Design (Magic Patterns), Straight palette | Coral (2.9:1) as a focused field's edge and an invalid field's edge; the seven Popkin colours (1.7 to 2.9:1) as edges, rings and icons on white | `--color-border-focus` and `--color-danger-border` are deep coral; `--accent-line` darkens the Popkin colour 30% toward black in light |

## Popkin colour contrast

The Straight palette (Magic Patterns, 12 November 2026) makes every Popkin colour a light mid-tone that carries black text. Coral, sun and green fills
are lighter than 3:1 against white; that is allowed because the label or the text beside a fill identifies it (1.4.11 asks no fill contrast). Where a
colour is drawn as text or an edge it is darkened: `--accent-text` 55% and `--accent-line` 70% of the colour, mixed with black, in light.

`check_contrast.py` cannot resolve `color-mix()`, so every pairing that mixes a Popkin colour into a surface was computed separately with the
same sRGB mixing the browser uses. Minimums: 4.5:1 for text, 3:1 for lines. All 98 pass.

| Colour | Theme | Black on colour | Colour text on tint | on card | on washed page | Text on tint | Line on card | Line on page |
|---|---|---|---|---|---|---|---|---|
| Coral | light | 7.33 | 6.85 | 7.61 | 7.04 | 18.89 | 5.35 | 4.94 |
| Coral | dark | 7.33 | 7.21 | 10.22 | 9.56 | 10.37 | 8.24 | 7.71 |
| Teal (green) | light | 5.52 | 8.10 | 9.12 | 8.36 | 18.64 | 6.76 | 6.19 |
| Teal (green) | dark | 5.52 | 7.16 | 9.51 | 9.17 | 11.06 | 7.21 | 6.95 |
| Sky | light | 8.33 | 6.35 | 6.96 | 6.53 | 19.18 | 4.81 | 4.52 |
| Sky | dark | 8.33 | 7.38 | 11.01 | 10.13 | 9.86 | 9.12 | 8.39 |
| Berry | light | 8.37 | 6.32 | 6.93 | 6.51 | 19.16 | 4.77 | 4.48 |
| Berry | dark | 8.37 | 7.30 | 10.90 | 9.99 | 9.84 | 9.07 | 8.31 |
| Leaf (sage) | light | 9.91 | 5.68 | 6.10 | 5.80 | 19.56 | 4.13 | 3.93 |
| Leaf (sage) | dark | 9.91 | 7.48 | 11.75 | 10.52 | 9.35 | 10.14 | 9.07 |
| Plum | light | 7.32 | 6.91 | 7.63 | 7.11 | 19.00 | 5.37 | 5.01 |
| Plum | dark | 7.32 | 7.27 | 10.50 | 9.80 | 10.18 | 8.50 | 7.93 |
| Amber (sun) | light | 12.28 | 4.94 | 5.21 | 4.99 | 19.91 | 3.43 | 3.28 |
| Amber (sun) | dark | 12.28 | 7.62 | 12.79 | 11.13 | 8.75 | 11.45 | 9.96 |

## Verification

Run on 13 November 2026, after applying the Straight palette:

- `check_contrast.py` on `tokens/tokens.css`: 142 passed, 0 failed, 0 unresolved (light and dark). The primary fill pairs now ask 1:1 (the label
  identifies the button), the dark focus ring is checked against the page it sits on, and the raw Popkin colours as edges are checked in dark only
  (light draws them with `--accent-line`).
- Popkin colour mixes: 98 passed, 0 failed (table above).
- `check_design_system.py docs/design-system`: 63 pages, 0 errors, 0 warnings. `check_mocks.py docs/mocks`: 46 screens, 162 mocks, 0 errors, 0 warnings.
- The app: `npm run lint`, `npm run format:check`, the behaviour specs (63 passed) and `npm run parity` (220 passed).

Run on 12 November 2026:

- `python .claude/skills/extracting-design-systems/scripts/check_contrast.py docs/design-system/tokens/tokens.css`: 143 passed, 0 failed, 0 unresolved (light and dark).
- Popkin colour mixes: 98 passed, 0 failed (table above).
- `python .claude/skills/extracting-design-systems/scripts/check_design_system.py docs/design-system`: 63 pages (41 components, 9 patterns), 0 errors, 0 warnings.
- `python .claude/skills/writing-html-mocks/scripts/check_mocks.py docs/mocks` after pointing the mocks at this system: 46 screens, 162 mocks, 0 errors, 0 warnings; no horizontal scroll and no failed requests at 360, 768 and 1280px.
- Every documentation page loaded at 360 and 1280px: no horizontal scroll, no failed requests.
- Screenshots of the index, the color page and the button, dialog and message pages at 360 and 1280px in both themes, and of eight mocks at 360px in both themes, reviewed by eye. Fixed from that review: the ghost button example, forced hover on danger and secondary buttons, light samples inside a dark page, and code tables overflowing at 360px.
