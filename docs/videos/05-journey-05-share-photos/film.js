// Video 05 · Journey 5: Share photos. Twelve scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n].start - Film.at(id);
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

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/** A close-up of the top of a tall picture: `height` film pixels of it, from its top edge. */
const topOf = (src, style, height, attrs) =>
  `<div class="closeup closeup--top" style="${style};height:${height}px" ${attrs}><img src="shots/${src}.png" alt=""></div>`;
/** On a coral field the accent ring would vanish: the ring is white there. */
const onCoral = ';outline-color:var(--palette-white)';
/** On the dark fields the ring is the lighter coral the accent words use. */
const onNight = ';outline-color:var(--palette-coral-light)';

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';

// ── Act 1: the album ────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1080)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 5</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'One album,', { accent: 'everyone’s photos.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Share photos.</p>
  </div>
  ${phone('shots/album-xs-dark.png', { width: 470, theme: 'dark', style: at(1290, 80, 470), attrs: 'data-notch="off" ' + arrive(S, S.beat(2), 5) })}
  </div>
`);

Film.scene('album', (S) => `
  <div class="fill field--sand">
  ${phone('shots/album-xs.png', { width: 480, style: at(170, 74, 480), attrs: 'data-notch="off" ' + arrive(S, 0, -3, -10) })}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Photos · L2-032</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Everyone’s photos,', { accent: 'by day.' })}</h1>
  </div>
  ${closeup('album-header', at(810, 440, 640), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${topOf('album-grid', at(1320, 500, 500), 506, pop(S, onBeat(S, said('album', 2)), { tilt: 1.5 }))}
  <p class="kicker" style="${at(810, 760, 470)}" ${S.rise(onBeat(S, said('album', 1)))}>Saturday, then Friday:<br>the latest day first</p>
  <p class="kicker" style="${at(810, 900, 470)}" ${S.rise(onBeat(S, said('album', 2)) + S.BEAT)}>The first photo:<br>twice the width and height</p>
  </div>
`);

Film.scene('filters', (S) => {
  const mine = onBeat(S, said('filters', 1));
  const none = onBeat(S, said('filters', 2));
  return `
  <div class="fill field--coral">
  <div style="${at(120, 90, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Everyone and Mine · L2-032</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Everyone’s,', { accent: 'or yours.' })}</h1>
  </div>
  ${closeup('filter-everyone', at(130, 520, 620) + onCoral, pop(S, S.beat(3), { tilt: -1.5, until: mine }))}
  ${closeup('filter-mine', at(130, 520, 620) + onCoral, pop(S, mine, { tilt: -1.5 }))}
  ${closeup('empty', at(800, 360, 470) + onCoral, pop(S, none, { tilt: 2 }))}
  <p class="kicker" style="${at(130, 780, 620)}" ${S.rise(mine + S.BEAT)}>Marked as pressed</p>
  ${states(S, ['album-xs', 'mine-xs', 'empty-xs'], [mine, none], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
}, { before: 0.3 });

// ── Act 2: Add photos ───────────────────────────────────────────────────────────────────────────
Film.scene('add', (S) => {
  const each = onBeat(S, said('add', 1));
  const counts = onBeat(S, said('add', 2));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 60, 1250)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Add photos · L2-031</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'Up to twenty,', { accent: 'a caption each.' })}</h1>
  </div>
  ${browser('shots/add-xl.png', { width: 1100, url: 'popkin.app/p/…/photos', style: at(90, 300, 1100), attrs: arrive(S, 0.1, -1, -4) })}
  ${states(S, ['add-xs', 'add-caption-xs'], [each], { width: 430, style: at(1400, 110, 430), when: 0.2, tilt: 3 })}
  ${closeup('add-row', at(560, 640, 800), pop(S, each, { tilt: -1.5 }))}
  ${closeup('add-action', at(640, 850, 700), pop(S, counts, { tilt: 1 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('limits', (S) => `
  <div class="fill field--night">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Over the limit · L2-031</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Too large?', { accent: 'It says why.' })}</h1>
  </div>
  ${closeup('too-large-row', at(130, 500, 960) + onNight, pop(S, onBeat(S, said('limits', 0) + 2.2), { tilt: -1.5 }))}
  ${closeup('too-large-action', at(330, 850, 700) + onNight, pop(S, onBeat(S, said('limits', 0) + 5.6), { tilt: 1 }))}
  ${phone('shots/too-large-xs.png', { width: 460, style: at(1350, 90, 460), attrs: 'data-notch="off" ' + arrive(S, 0.1, 3) })}
  </div>
`);

Film.scene('upload', (S) => {
  const failed = onBeat(S, said('upload', 1));
  return `
  <div class="fill field--teal">
  ${states(S, ['adding-xs', 'failed-xs'], [failed], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 100, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The upload · L2-031</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'How far,', { accent: 'and what failed.' })}</h1>
  </div>
  ${closeup('adding-footer', at(840, 520, 900) + onCoral, pop(S, S.beat(3), { tilt: -1.5, until: failed }))}
  <p class="kicker" style="${at(840, 740, 900)}" ${S.ref((el, t) => { el.style.opacity = t >= failed ? 0 : enter(t, S.beat(5), 0.3); })}>The progress bar, “Uploading 1 of 3”, and “Adding…”</p>
  ${closeup('failed-outcome', at(840, 480, 860) + onCoral, pop(S, failed, { tilt: -1.5 }))}
  ${closeup('failed-row', at(900, 740, 860) + onCoral, pop(S, failed + S.BEAT * 2, { tilt: 1.5 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('live', (S) => {
  const arrives = onBeat(S, said('live', 0) + 1.6);
  return `
  <div class="fill field--sand">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>As they are added · L2-031</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'New photos,', { accent: 'no reload.' })}</h1>
  </div>
  ${closeup('live-before-header', at(130, 560, 900), pop(S, S.beat(3), { tilt: -1.5, until: arrives }))}
  ${closeup('live-after-header', at(130, 560, 900), pop(S, arrives, { tilt: -1.5 }))}
  ${states(S, ['live-before-xs', 'live-after-xs'], [arrives], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

// ── Act 3: one photo, full screen ───────────────────────────────────────────────────────────────
Film.scene('view', (S) => {
  const next = onBeat(S, said('view', 1));
  const close = onBeat(S, said('view', 2));
  const one = (src, x, when, tilt) => phone(`shots/${src}.png`, { width: 360, theme: 'dark', style: at(x, 280, 360), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });
  const key = (text) => `<span style="display:inline-block;margin-right:16px;padding:12px 26px;border:3px solid var(--palette-white);border-radius:var(--radius-md);font:700 34px/1.2 var(--font-family-sans)">${text}</span>`;
  return `
  <div class="fill field--coral">
  <div style="${at(120, 70, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>View a photo · L2-033</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'The whole photo,', { accent: 'full screen.' })}</h1>
  </div>
  ${closeup('photo-bar', at(110, 380, 640) + onCoral, pop(S, onBeat(S, said('view', 0) + 3), { tilt: -1.5 }))}
  ${closeup('photo-caption', at(130, 550, 640) + onCoral, pop(S, onBeat(S, said('view', 0) + 6.2), { tilt: 1 }))}
  <div style="${at(120, 760, 760)}" ${S.rise(next, { y: 40 })}>${key('←')}${key('→')}${key('Swipe')}</div>
  <div style="${at(120, 880, 760)}" ${S.rise(close, { y: 40 })}>${key('Close')}${key('Esc')}</div>
  ${one('photo-xs', 820, 0.1, -2)}
  ${one('photo-next-xs', 1180, next, 0)}
  ${one('photo-third-xs', 1540, next + S.BEAT * 2, 2)}
  </div>`;
}, { before: 0.3 });

// ── Act 4: the same screens on every form factor ────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const steps = [S.beat(11), S.beat(21), S.beat(30)];
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 1.2)), 0);
  const label = (i, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    const from = i === 0 ? S.beat(2) : steps[i - 1] + 0.6;
    el.style.opacity = i < steps.length && t >= steps[i] + 0.6 ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Three across,', { accent: 'then six.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/album-xs.png', width: 390, height: 780 },
      { src: 'shots/album-m.png', width: 768, height: 1024 },
      { src: 'shots/album-l.png', width: 1024, height: 768 },
      { src: 'shots/album-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${closeup('add-floating', at(1290, 420, 300) + onCoral, S.ref((el, t) => {
    const q = enter(t, S.beat(5), 0.35, ease.back);
    el.style.opacity = t >= steps[0] ? 0 : clamp(q * 3);
    el.style.transform = `scale(${lerp(0.6, 1, q)}) rotate(3deg)`;
  }))}
  ${closeup('add-in-header', at(1400, 300, 380) + onCoral, S.ref((el, t) => {
    const q = enter(t, steps[0] + 1.3, 0.35, ease.back);
    el.style.opacity = t >= steps[1] ? 0 : clamp(q * 3);
    el.style.transform = `scale(${lerp(0.6, 1, q)}) rotate(3deg)`;
  }))}
  ${label(0, 'A phone: three across, and “Add” floating')}
  ${label(1, 'From 768 px: four across, “Add photos” in the header')}
  ${label(2, '1024 px: five across, beside the sidebar')}
  ${label(3, '1440 px: six across')}
  </div>`;
}, { before: 0.3 });

Film.scene('panel', (S) => {
  const beside = onBeat(S, said('panel', 0) + 1.6);
  return `
  <div class="fill field--teal">
  <div style="${at(120, 60, 1300)}">
    <p class="kicker" ${S.rise(S.beat(1))}>From 1024 px · L2-058</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'A panel,', { accent: 'beside the photo.' })}</h1>
  </div>
  ${browser('shots/photo-xl.png', { width: 1120, theme: 'dark', url: 'popkin.app/p/…/photos/…', style: at(100, 290, 1120), attrs: arrive(S, beside, -1, -4) })}
  ${phone('shots/photo-xs.png', { width: 400, theme: 'dark', style: at(1420, 130, 400), attrs: 'data-notch="off" ' + arrive(S, 0.1, 3) })}
  ${topOf('photo-panel', at(760, 800, 640) + onCoral, 200, pop(S, beside + S.BEAT * 3, { tilt: -1.5 }))}
  </div>`;
});

// ── Act 5: what the tests prove, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  const store = onBeat(S, said('proof', 1) + 4.2);
  const fact = (n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans)" ${S.rise(when, { y: 50 })}>
    <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span>${text}</div>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
  </div>
  <div style="${at(120, 500, 700)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Journey 14: reactions, comments, saving, deleting.</p>
  </div>
  <div style="${at(120, 780, 700)}" ${S.rise(store, { y: 60 })}>
    <p class="kicker">For the owner</p>
    <p class="lede" style="margin-top:14px;font-weight:700">A deployed system needs a photo store.</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(1, S.bar(1), 'Stored files carry no location or device data')}
    ${fact(2, S.bar(1) + S.BEAT * 2, 'Only a member reads the album')}
    ${fact(3, S.bar(2), 'The latest 60 load, and more as you scroll')}
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
wipeInto('filters', 'var(--palette-teal)');
wipeInto('add', 'var(--palette-coral)');
wipeInto('upload', 'var(--palette-sun)');
wipeInto('view', 'var(--palette-night)');
wipeInto('grow', 'var(--palette-teal)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
