// Video 06 · Journey 6: Come back. Twelve scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it: a cut belongs on the grid. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;

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

/**
 * One phone whose screen changes with a hard cut at each of `cuts` (scene seconds): shots[0] until
 * cuts[0], shots[1] until cuts[1], and so on.
 */
const states = (S, shots, cuts, { width, style, when = 0, tilt = 0, from = 12, theme = 'light' }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    style,
    theme,
    attrs: 'data-notch="off" ' + arrive(S, when, tilt, from, (t) => cuts.filter((c) => t >= c).length === i),
  })).join('');

/** One phone, without its notch. */
const one = (S, src, x, y, width, when, tilt, theme = 'light') =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/** On a coral or teal field the accent ring would vanish: the ring is white there. */
const onCoral = ';outline-color:var(--palette-white)';
/** On the dark fields the ring is the lighter coral the accent words use. */
const onNight = ';outline-color:var(--palette-coral-light)';

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: sign in ──────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 6</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Back to', { accent: 'your Popkins.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Come back.</p>
  </div>
  ${phone('shots/popkins-xs-dark.png', { width: 470, theme: 'dark', style: at(1290, 80, 470), attrs: 'data-notch="off" ' + arrive(S, S.beat(2), 5) })}
  </div>
`);

Film.scene('signin', (S) => {
  const invalid = onBeat(S, said('signin', 1));
  const wide = onBeat(S, said('signin', 2)) - S.BEAT;
  return `
  <div class="fill field--sand">
  ${states(S, ['sign-in-xs', 'sign-in-invalid-xs'], [invalid], { width: 480, style: at(170, 74, 480), tilt: -3, from: -10 })}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Sign in · L2-006</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Welcome back.', { accent: 'One field.' })}</h1>
  </div>
  ${closeup('sign-in-field', at(820, 440, 640), pop(S, S.beat(3), { tilt: -1.5, until: invalid }))}
  ${closeup('sign-in-button', at(1180, 720, 620), pop(S, onBeat(S, part('signin', 0, 0.55)), { tilt: 1.5, until: invalid }))}
  ${closeup('sign-in-invalid-field', at(820, 440, 760), pop(S, invalid, { tilt: -1.5, until: wide }))}
  ${browser('shots/sign-in-xl.png', { width: 1020, url: 'popkin.app/sign-in', style: at(800, 370, 1020), attrs: arrive(S, wide, 1, 5) })}
  </div>`;
});

Film.scene('code', (S) => {
  const opens = onBeat(S, part('code', 0, 0.5));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 840)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The code · L2-007</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Six digits,', { accent: 'then your Popkins.' })}</h1>
  </div>
  ${closeup('code-field', at(130, 640, 640), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${one(S, 'code-xs', 1000, 120, 400, 0.1, -2)}
  ${one(S, 'after-code-xs', 1450, 120, 400, opens, 2)}
  </div>`;
});

// ── Act 2: My Popkins ───────────────────────────────────────────────────────────────────────────
Film.scene('cards', (S) => {
  const left = [0.7, 0.81, 0.88].map((f) => onBeat(S, part('cards', 0, f) - 0.2));
  const badge = onBeat(S, said('cards', 1));
  const wrapped = onBeat(S, said('cards', 2));
  return `
  <div class="fill field--teal">
  <div style="${at(120, 60, 1250)}">
    <p class="kicker" ${S.rise(S.beat(1))}>My Popkins · L2-017, L2-018</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'Your Popkins,', { accent: 'at a glance.' })}</h1>
  </div>
  ${closeup('card-lakeside', at(760, 300, 540) + onCoral, pop(S, S.beat(3), { tilt: -1 }))}
  ${closeup('card-thursday', at(780, 545, 540) + onCoral, pop(S, S.beat(5), { tilt: 1 }))}
  ${closeup('card-tigers', at(760, 780, 540) + onCoral, pop(S, S.beat(7), { tilt: -1 }))}
  ${closeup('foot-lakeside', at(130, 340, 520) + onCoral, pop(S, left[0], { tilt: -1.5, until: wrapped }))}
  ${closeup('foot-thursday', at(150, 470, 520) + onCoral, pop(S, left[1], { tilt: 1, until: wrapped }))}
  ${closeup('foot-tigers', at(130, 590, 520) + onCoral, pop(S, left[2], { tilt: -1, until: wrapped }))}
  ${closeup('wrapped-up', at(130, 350, 560) + onCoral, pop(S, wrapped, { tilt: -1.5 }))}
  <p class="kicker" style="${at(130, 760, 560)}" ${S.rise(badge)}>A badge:<br>the messages you have not read</p>
  <p class="kicker" style="${at(130, 900, 560)}" ${S.rise(wrapped + S.BEAT)}>“Wrapped up”, each marked “Recap”</p>
  ${one(S, 'popkins-xs', 1410, 100, 430, 0.1, 3)}
  </div>`;
}, { before: 0.3 });

Film.scene('live', (S) => {
  const arrives = onBeat(S, part('live', 0, 0.42));
  return `
  <div class="fill field--sand">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>As it arrives · L2-027</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'A new message', { accent: 'moves it first.' })}</h1>
  </div>
  ${closeup('card-thursday', at(130, 600, 800), pop(S, S.beat(3), { tilt: -1.5, until: arrives }))}
  ${closeup('live-card', at(130, 600, 800), pop(S, arrives, { tilt: -1.5 }))}
  ${states(S, ['live-before-xs', 'live-after-xs'], [arrives], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

Film.scene('grow', (S) => {
  const steps = [1, 2, 3].map((n) => onBeat(S, said('grow', n)) - S.BEAT);
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 1.2)), 0);
  const label = (i, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    const from = i === 0 ? S.beat(2) : steps[i - 1] + 0.6;
    el.style.opacity = i < steps.length && t >= steps[i] + 0.6 ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One across,', { accent: 'then three.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/popkins-xs.png', width: 390, height: 780 },
      { src: 'shots/popkins-640.png', width: 640, height: 900 },
      { src: 'shots/popkins-m.png', width: 768, height: 1024 },
      { src: 'shots/popkins-l.png', width: 1024, height: 768 },
    ], p, { height: 760 })}
  </div>
  ${closeup('new-floating', at(1330, 420, 340) + onCoral, S.ref((el, t) => {
    const q = enter(t, S.beat(4), 0.35, ease.back);
    el.style.opacity = t >= steps[1] ? 0 : clamp(q * 3);
    el.style.transform = `scale(${lerp(0.6, 1, q)}) rotate(3deg)`;
  }))}
  ${closeup('new-in-header', at(1360, 300, 380) + onCoral, S.ref((el, t) => {
    const q = enter(t, steps[1] + 1.3, 0.35, ease.back);
    el.style.opacity = t >= steps[2] ? 0 : clamp(q * 3);
    el.style.transform = `scale(${lerp(0.6, 1, q)}) rotate(3deg)`;
  }))}
  ${label(0, 'A phone: one across, and “New Popkin” floating')}
  ${label(1, 'From 640 px: two across')}
  ${label(2, 'From 768 px: “New Popkin” in the header')}
  ${label(3, 'From 1024 px: three across')}
  </div>`;
}, { before: 0.3 });

// ── Act 3: someone new, and Scan to join ────────────────────────────────────────────────────────
Film.scene('newcomer', (S) => {
  const asks = onBeat(S, part('newcomer', 0, 0.62));
  const none = onBeat(S, said('newcomer', 1));
  return `
  <div class="fill field--night">
  <div style="${at(120, 100, 860)}">
    <p class="kicker" ${S.rise(S.beat(1))}>No account yet · L2-006</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'No account?', { accent: 'Just a name.' })}</h1>
  </div>
  ${closeup('name-heading', at(130, 520, 640) + onNight, pop(S, asks, { tilt: -1.5 }))}
  <p class="kicker" style="${at(130, 800, 800)}" ${S.rise(none + S.BEAT * 2)}>“No Popkins yet”</p>
  <p class="lede" style="${at(130, 850, 800)};font-weight:700" ${S.rise(none + S.BEAT * 5)}>“Start a Popkin” · “Scan to join”</p>
  ${states(S, ['code-xs', 'name-xs'], [asks], { width: 400, style: at(1010, 130, 400), when: 0.1, tilt: -2 })}
  ${one(S, 'empty-xs', 1460, 130, 400, none, 2)}
  </div>`;
}, { before: 0.3 });

Film.scene('scan', (S) => {
  const other = onBeat(S, said('scan', 1));
  const found = onBeat(S, said('scan', 2));
  return `
  <div class="fill field--coral">
  <div style="${at(120, 70, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Scan to join · L2-015</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'Scan to join,', { accent: 'with your camera.' })}</h1>
  </div>
  <p class="kicker" style="${at(120, 360, 640)}" ${S.rise(S.beat(4))}>A frame to hold<br>the QR code in</p>
  ${closeup('scan-other-alert', at(110, 540, 640) + onCoral, pop(S, other + S.BEAT, { tilt: -1.5 }))}
  ${closeup('scan-found-hint', at(130, 800, 640) + onCoral, pop(S, found + S.BEAT, { tilt: 1 }))}
  ${one(S, 'scan-xs', 820, 290, 340, 0.1, -2)}
  ${one(S, 'scan-other-xs', 1180, 290, 340, other, 0)}
  ${one(S, 'scan-found-xs', 1540, 290, 340, found, 2)}
  </div>`;
});

Film.scene('denied', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The camera refused · L2-015</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Camera refused?', { accent: 'It says how.' })}</h1>
  </div>
  ${closeup('scan-denied-body', at(130, 480, 780), pop(S, onBeat(S, part('denied', 0, 0.25)), { tilt: -1.5 }))}
  ${closeup('scan-denied-footer', at(500, 780, 600), pop(S, onBeat(S, part('denied', 0, 0.6)), { tilt: 1 }))}
  ${one(S, 'scan-denied-xs', 1350, 90, 460, 0.1, 3)}
  </div>
`);

// ── Act 4: loading, failure and offline ─────────────────────────────────────────────────────────
Film.scene('states', (S) => {
  const cuts = [1, 2, 3].map((n) => onBeat(S, said('states', n)));
  const row = (when, text) => `<div style="${card};margin-bottom:24px;padding:28px 40px;font:700 36px/1.25 var(--font-family-sans)" ${S.rise(when, { y: 50 })}>${text}</div>`;
  return `
  <div class="fill field--teal">
  ${states(S, ['loading-xs', 'error-xs', 'offline-banner-xs', 'offline-xs'], cuts, { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 80, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Loading, failure, offline · L2-056</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never left', { accent: 'guessing.' })}</h1>
  </div>
  <div style="${at(820, 400, 980)}">
    ${row(S.beat(4), 'Loading: cards the size of real cards')}
    ${row(cuts[0] + S.BEAT, '“We couldn’t load your Popkins” · “Try again”')}
    <img class="closeup" src="shots/offline-banner.png" alt="" style="width:100%;margin:10px 0 34px${onCoral}" ${pop(S, cuts[1] + S.BEAT, { tilt: 0 })}>
    ${row(cuts[2] + S.BEAT, '“You’re offline”: a screen never loaded needs a connection')}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 5: what the tests prove, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
  </div>
  <div style="${at(120, 620, 700)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Join with a code, the recap, your account.</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'A code is answered the same, with or without an account')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.78)), 'A session lasts thirty days')}
    ${fact(S, 3, onBeat(S, part('proof', 0, 1)), 'Only your own Popkins are listed')}
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
wipeInto('cards', 'var(--palette-coral)');
wipeInto('grow', 'var(--palette-teal)');
wipeInto('newcomer', 'var(--palette-coral)');
wipeInto('states', 'var(--palette-sun)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
