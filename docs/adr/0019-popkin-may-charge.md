# 0019. Popkin may charge one day

## Status

Accepted, 14 November 2026. Replaces the promise of L1-015 as first written, "Popkin must be free
to use: no payment, no premium tier and no advertising anywhere in it."

## Context

Popkin was described everywhere as "a free platform for pop-up communities", and L1-015 promised
no payment and no premium tier. Running Popkin costs money that grows with the people who use it:
the media relay of calls, photo storage and bandwidth, the hub, the database and the sign-in
codes. The owner has decided that Popkin will need to charge one day, most likely for a Popkin
with more members, a longer life or larger calls. A promise made today that it will always be
free would have to be broken then, and its people would have been told something untrue.

## Decision

- Popkin makes no claim that it is free. No screen, page, mock, film, requirement, design or
  document says Popkin is free, costs nothing, or will never have a paid tier.
- L1-015 becomes "No advertising": Popkin carries no advertising and loads no advertising or
  tracking script. That promise stays, because charging does not need it broken.
- Until a requirement says what is charged for, how and to whom, no journey asks for payment or a
  payment method. Pricing is a feature like any other: it gets its requirement, its detailed
  design and its mocks before any code (AGENTS.md).
- The closing band of the landing page and the marketing site says "No ads. Like, actually
  none." in place of "Free. Like, actually free."; the hero says "Takes about a minute." and the
  invite "No app to download."

## Consequences

- Copy that promised "free" or "no premium tier" is removed from the app, the marketing site,
  the mocks, the design system and the docs, and the behaviour specs assert the new words.
- "Free" in its other senses stays: a member who is free in the evening (Schedules), an address
  that is free to take, free text.
- The narrated videos in `docs/videos/` were scripted and rendered with the old words. They are
  not rebuilt by this change; each video's script and film take the new words the next time it
  is regenerated.
- When pricing is designed, the mission (L0-001, still to be written) must say how paying fits
  what Popkin is for; this record does not decide it.
