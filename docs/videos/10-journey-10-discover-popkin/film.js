// Video 10 · Journey 10: Discover Popkin. Thirteen scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it: a cut belongs on the grid. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;
/** A headline whose accent words start a line of their own. */
const twoLines = (S, when, text, accent) => `${S.words(when, text)}<br>${S.words(when + 0.1, '', { accent })}`;

/**
 * A device that rises into place at `when` and settles at `tilt` degrees. With `show`, it is one
 * of several states of the same screen in the same place: it is drawn only while show(t) is true.
 */
const arrive = (S, when, tilt = 0, from = 12, show = () => true) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.visibility = show(t) ? 'visible' : 'hidden';
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });

/** One phone, without its notch. */
const one = (S, src, x, y, width, when, tilt, theme = 'light') =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });

/**
 * One browser window whose page changes with a hard cut at each of `cuts` (scene seconds):
 * shots[0] until cuts[0], shots[1] until cuts[1], and so on.
 */
const pages = (S, shots, cuts, { width, style, when = 0 }) =>
  shots.map((src, i) => browser(`shots/${src}.png`, {
    width,
    style,
    attrs: arrive(S, when, 0, 3, (t) => cuts.filter((c) => t >= c).length === i),
  })).join('');

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/**
 * A close-up of part of a picture: the rectangle x, y, w, h of the PNG (in its own pixels), drawn
 * `k` film pixels to each of them, at left, top. (`zoom` scales the picture's own offsets too.)
 */
const cut = (src, { x, y, w, h, k, left, top, ring = '' }, attrs) =>
  `<div class="closeup" style="position:absolute;left:${left}px;top:${top}px;width:${w * k}px;height:${h * k}px;overflow:hidden${ring}" ${attrs}>` +
  `<img src="shots/${src}.png" alt="" style="position:absolute;left:${-x}px;top:${-y}px;zoom:${k}"></div>`;
/** On a coral, sun or teal field the accent ring would vanish: the ring is white there. */
const onColour = ';outline-color:var(--palette-white)';
/** On the sun field white is faint too: the ring is black. */
const onSun = ';outline-color:var(--palette-black)';

/** Words of the film's own that are on screen from `from` until `until` (scene seconds). */
const during = (S, from, until) => S.ref((el, t) => {
  const p = enter(t, from, 0.3);
  el.style.opacity = t >= until ? 0 : p;
  el.style.transform = `translateY(${(1 - p) * 40}px)`;
});

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: a visitor reads the landing page ─────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 10</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'The front', { accent: 'door.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Discover Popkin.</p>
  </div>
  ${one(S, 'landing-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('hero', (S) => {
  const start = onBeat(S, part('hero', 0, 0.62));
  const free = onBeat(S, part('hero', 0, 0.8));
  const preview = onBeat(S, said('hero', 1));
  return `
  <div class="fill field--sand">
  ${one(S, 'landing-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The landing page · L2-001</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Popped up', { accent: 'in seconds.' })}</h1>
  </div>
  ${closeup('hero-text', at(820, 370, 520), pop(S, onBeat(S, part('hero', 0, 0.28)), { tilt: -1.5, until: preview }))}
  ${closeup('hero-start', at(1400, 470, 420), pop(S, start, { tilt: 2, until: preview }))}
  ${closeup('hero-free', at(1390, 720, 440), pop(S, free, { tilt: -1, until: preview }))}
  ${closeup('preview', at(820, 360, 580), pop(S, preview, { tilt: -1.5 }))}
  <p class="kicker" style="${at(1460, 520, 400)}" ${S.rise(preview + S.BEAT)}>The preview of a Popkin, in the hero</p>
  </div>`;
});

Film.scene('how', (S) => {
  const step = (n, x, y, tilt, f) => closeup(`step-${n}`, at(x, y, 580), pop(S, onBeat(S, part('how', 0, f)), { tilt }));
  return `
  <div class="fill field--paper">
  <div style="position:absolute;left:0;right:0;top:80px;text-align:center">
    <p class="kicker" ${S.rise(S.beat(1))}>How it works · L2-001</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1), 'Scan. Join.', { accent: 'You’re in.' })}</h1>
  </div>
  ${step(1, 60, 500, -2, 0.5)}
  ${step(2, 670, 680, 1, 0.66)}
  ${step(3, 1280, 500, 2, 0.86)}
  </div>`;
});

Film.scene('ideas', (S) => {
  const idea = (name, x, tilt, f) => closeup(`idea-${name}`, at(x, 450, 400) + onColour, pop(S, onBeat(S, part('ideas', 1, f)), { tilt }));
  return `
  <div class="fill field--teal">
  <div style="${at(100, 70, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Ideas · L2-001</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Four', { accent: 'ideas.' })}</h1>
  </div>
  ${closeup('ideas-heading', at(1100, 90, 660) + onColour, pop(S, onBeat(S, part('ideas', 0, 0.35)), { tilt: 1.5 }))}
  ${idea('small-group', 90, -1.5, 0)}
  ${idea('hackathon', 536, 1, 0.26)}
  ${idea('team', 982, -1, 0.52)}
  ${idea('family-trip', 1428, 1.5, 0.76)}
  </div>`;
});

Film.scene('compare', (S) => {
  const end = onBeat(S, said('compare', 1));
  return `
  <div class="fill field--sand">
  ${one(S, 'compare-xs', 110, 90, 440, 0.1, -3)}
  <div style="${at(660, 60, 1200)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Group chat, or Popkin · L2-001</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Better than a', { accent: 'group chat.' })}</h1>
  </div>
  ${closeup('compare-table', at(670, 320, 1130), pop(S, onBeat(S, part('compare', 0, 0.3)), { tilt: -1 }))}
  ${cut('compare-table', { x: 0, y: 728, w: 1696, h: 124, k: 0.74, left: 600, top: 940 }, pop(S, end, { tilt: 1 }))}
  </div>`;
});

Film.scene('free', (S) => {
  const footer = onBeat(S, said('free', 1));
  return `
  <div class="fill field--sun">
  ${closeup('free-band-xs', at(150, 170, 520) + onSun, pop(S, S.beat(1), { tilt: -2 }))}
  <div style="${at(760, 300, 560)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Free · L2-061</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Actually', 'free.')}</h1>
    <p class="lede" style="margin-top:36px;font-weight:700" ${S.rise(onBeat(S, part('free', 0, 0.55)))}>No ads.<br>No premium tier.</p>
  </div>
  ${closeup('footer', at(1320, 250, 480) + onSun, pop(S, footer, { tilt: 2 }))}
  <p class="kicker" style="${at(1330, 800, 480)}" ${S.rise(footer + S.BEAT)}>The footer</p>
  </div>`;
});

// ── Act 2: getting around, and where each action leads ──────────────────────────────────────────
Film.scene('jump', (S) => {
  const how = onBeat(S, part('jump', 0, 0.3));
  const ideas = how + S.BEAT * 6;
  return `
  <div class="fill field--paper">
  ${pages(S, ['landing-xl', 'how-xl', 'ideas-jump-xl'], [how, ideas], { width: 1180, style: at(90, 220, 1180), when: 0.1 })}
  <div style="${at(100, 40, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The navigation · L2-002</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Jump to a', { accent: 'section.' })}</h1>
  </div>
  ${cut('nav-xl', { x: 1360, y: 0, w: 944, h: 168, k: 0.58, left: 1320, top: 300 }, pop(S, S.beat(2), { tilt: 1.5 }))}
  <p class="kicker" style="${at(1330, 470, 540)}" ${during(S, how, ideas)}>“How it works”</p>
  ${closeup('how-heading', at(1330, 540, 520), pop(S, how, { tilt: -1.5, until: ideas }))}
  <p class="kicker" style="${at(1330, 470, 540)}" ${S.rise(ideas)}>“Ideas”</p>
  ${closeup('ideas-heading', at(1330, 540, 520), pop(S, ideas, { tilt: -1.5 }))}
  <p class="kicker" style="${at(1330, 800, 540)}" ${S.rise(ideas + S.BEAT * 2)}>Focus moves to the heading</p>
  </div>`;
}, { before: 0.3 });

Film.scene('phonenav', (S) => {
  const footer = onBeat(S, part('phonenav', 0, 0.6));
  return `
  <div class="fill field--coral">
  ${one(S, 'landing-xs', 110, 90, 440, 0.1, -3)}
  <div style="${at(620, 70, 700)};text-align:center">
    <p class="kicker" ${S.rise(S.beat(1))}>On a phone · L2-002</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'On a', { accent: 'phone.' })}</h1>
  </div>
  <p class="kicker" style="${at(630, 380, 680)}" ${S.rise(S.beat(3))}>The navigation</p>
  ${closeup('nav-xs', at(620, 430, 680) + onColour, pop(S, S.beat(3), { tilt: -1.5 }))}
  <p class="kicker" style="${at(630, 700, 680)};text-align:right" ${S.rise(footer)}>The footer</p>
  ${closeup('footer-sign-in', at(880, 750, 420) + onColour, pop(S, footer, { tilt: 1.5 }))}
  ${phone('shots/footer-xs.png', { width: 440, style: at(1370, 90, 440), attrs: 'data-notch="off" ' + arrive(S, footer - S.BEAT, 3, 11) })}
  </div>`;
});

Film.scene('actions', (S) => {
  const signIn = onBeat(S, part('actions', 0, 0.55));
  const signedIn = onBeat(S, said('actions', 1));
  const label = (x, when, text) => `<p class="kicker" style="${at(x, 232, 400)}" ${S.rise(when)}>${text}</p>`;
  return `
  <div class="fill field--sand">
  <div style="${at(120, 50, 1700)}">
    <h1 class="headline headline--md">${S.words(S.beat(1), 'Where each', { accent: 'leads.' })}</h1>
  </div>
  ${label(130, S.beat(1), '“Start a Popkin”')}
  ${one(S, 'sign-up-xs', 120, 280, 360, S.beat(1), -2)}
  ${label(570, signIn, '“Sign in”')}
  ${one(S, 'sign-in-xs', 560, 280, 360, signIn, 1)}
  <div style="${at(1010, 480, 360)}" ${S.rise(signedIn, { y: 40 })}>
    <p class="kicker">Already signed in?</p>
    <p class="lede" style="margin-top:14px;font-weight:700">The page is skipped.</p>
  </div>
  ${label(1450, signedIn + S.BEAT, 'My Popkins')}
  ${one(S, 'my-popkins-xs', 1440, 280, 360, signedIn + S.BEAT, 2)}
  </div>`;
});

// ── Act 3: the welcome screen ───────────────────────────────────────────────────────────────────
Film.scene('welcome', (S) => `
  <div class="fill field--coral">
  ${one(S, 'welcome-xs', 150, 74, 480, 0.1, -3)}
  <div style="${at(760, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The welcome screen · L2-002</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Three ways', { accent: 'on.' })}</h1>
  </div>
  ${closeup('welcome-heading', at(780, 380, 560) + onColour, pop(S, onBeat(S, part('welcome', 0, 0.2)), { tilt: -1.5, until: onBeat(S, part('welcome', 0, 0.5)) }))}
  ${closeup('welcome-start', at(780, 390, 640) + onColour, pop(S, onBeat(S, part('welcome', 0, 0.5)), { tilt: -1.5 }))}
  ${closeup('welcome-join', at(830, 580, 640) + onColour, pop(S, onBeat(S, part('welcome', 0, 0.64)), { tilt: 1 }))}
  ${closeup('welcome-sign-in', at(780, 770, 640) + onColour, pop(S, onBeat(S, part('welcome', 0, 0.8)), { tilt: -1 }))}
  ${one(S, 'welcome-xs-dark', 1530, 300, 320, onBeat(S, part('welcome', 0, 0.9)), 4, 'dark')}
  </div>`, { before: 0.3 });

// ── Act 4: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, lineOf('grow', 0).end - Film.at('grow'));
  const three = onBeat(S, said('grow', 1));
  const four = onBeat(S, part('grow', 1, 0.35));
  const across = onBeat(S, part('grow', 1, 0.72));
  const split = onBeat(S, said('grow', 2)) - S.BEAT;
  const p = (t) => [two, three, four].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  const between = (from, until) => S.ref((el, t) => { el.style.visibility = t >= from && t < until ? 'visible' : 'hidden'; });
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One column,', { accent: 'then four.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px" ${between(-1, across)}>
    ${S.grow([
      { src: 'shots/landing-xs.png', width: 390, height: 780 },
      { src: 'shots/landing-m.png', width: 768, height: 1024 },
      { src: 'shots/landing-l.png', width: 1024, height: 768 },
      { src: 'shots/landing-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  <div style="position:absolute;left:0;right:0;top:196px" ${between(across, split)}>
    ${S.grow([{ src: 'shots/ideas-xl.png', width: 1440, height: 900 }], () => 0, { height: 760 })}
  </div>
  ${tablet('shots/welcome-m.png', { width: 540, style: at(150, 200, 540), attrs: arrive(S, split, -1, 6) })}
  ${browser('shots/welcome-xl.png', { width: 1040, style: at(760, 240, 1040), attrs: arrive(S, split + S.BEAT * 2, 1, 6) })}
  ${label(S.beat(2), two + 0.6, 'A phone: one column')}
  ${label(two + 0.6, three + 0.6, '768 px: the preview still under the words')}
  ${label(three + 0.6, four + 0.6, 'From 1024 px: the hero beside its preview')}
  ${label(four + 0.6, across, '1440 px')}
  ${label(across, split, 'From 1024 px: four ideas across')}
  ${label(split + 0.3, Infinity, 'Welcome, split from 768 px · its two actions side by side from 1280 px')}
  </div>`;
}, { before: 0.3 });

// ── Act 5: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Nothing from', 'elsewhere.')}</h1>
  </div>
  <div style="${at(900, 190, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.2)), 'The page loads nothing from anywhere but Popkin')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.7)), 'Its links work from the keyboard')}
  </div>
  <div style="${at(900, 620, 900)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">The Join with a code screen.<br>Safety, Privacy and Help.</p>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('close', (S) => `
  <div class="fill field--night">${S.aurora((t) => 1 - exit(t, S.length - 2.5, 2.5) * 0.6)}
  <div style="position:absolute;left:0;right:0;top:360px;text-align:center">
    <p class="wordmark" ${S.rise(S.beat(1), { y: 40 })}>Popkin</p>
    <p class="lede" style="margin-top:48px" ${S.rise(S.bar(1))}>A free platform for pop-up communities.</p>
  </div>
  </div>
`);

// A change of act is a wipe in a Popkin colour; inside an act the cuts are hard.
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('jump', 'var(--palette-sun)');
wipeInto('welcome', 'var(--palette-teal)');
wipeInto('grow', 'var(--palette-sun)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
