// Video 07 · Journey 7: Group call. Thirteen scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet } = Film;

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

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: starting a call ──────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 7</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'The whole Popkin,', { accent: 'on a call.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Group call.</p>
  </div>
  ${phone('shots/call-six-xs.png', { width: 470, style: at(1290, 80, 470) + ';background:var(--palette-night-line)', attrs: 'data-notch="off" ' + arrive(S, S.beat(2), 5) })}
  </div>
`);

Film.scene('start', (S) => {
  const thread = onBeat(S, said('start', 1));
  return `
  <div class="fill field--sand">
  ${states(S, ['home-xs', 'chat-xs'], [thread], { width: 480, style: at(170, 74, 480), tilt: -3, from: -10 })}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Start a call · L2-029</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One tap,', { accent: 'two places.' })}</h1>
  </div>
  ${closeup('home-actions', at(820, 450, 800), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${closeup('chat-top-bar', at(940, 720, 840), pop(S, thread, { tilt: 1.5 }))}
  <p class="kicker" style="${at(950, 900, 840)}" ${S.rise(thread + S.BEAT * 2)}>“Start group call”, in the top bar</p>
  </div>`;
});

Film.scene('joining', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 110, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Joining · L2-029</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'First,', { accent: 'it gets ready.' })}</h1>
  </div>
  ${closeup('call-joining-top-bar', at(130, 520, 800), pop(S, onBeat(S, part('joining', 0, 0.55)), { tilt: -1.5 }))}
  ${cut('call-joining-xs', { x: 60, y: 545, w: 660, h: 375, k: 1, left: 330, top: 650 }, pop(S, onBeat(S, part('joining', 0, 0.8)), { tilt: 1 }))}
  ${one(S, 'call-joining-xs', 1350, 90, 460, 0.1, 3)}
  </div>
`);

Film.scene('alone', (S) => {
  const you = onBeat(S, part('alone', 0, 0.5));
  const waiting = onBeat(S, said('alone', 1));
  return `
  <div class="fill field--sun">
  <div style="${at(120, 90, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Alone on the call · L2-029</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Just you,', { accent: 'for now.' })}</h1>
  </div>
  ${closeup('call-alone-top-bar', at(130, 440, 800) + onSun, pop(S, you, { tilt: -1.5 }))}
  ${cut('call-alone-m', { x: 180, y: 1180, w: 1176, h: 360, k: 0.72, left: 130, top: 660, ring: onSun }, pop(S, waiting, { tilt: 1 }))}
  ${tablet('shots/call-alone-m.png', { width: 640, style: at(1170, 120, 640), attrs: arrive(S, 0.1, 2, 10) })}
  </div>`;
});

// ── Act 2: a call under way ─────────────────────────────────────────────────────────────────────
Film.scene('six', (S) => {
  const ring = onBeat(S, said('six', 1));
  const avatar = onBeat(S, said('six', 2));
  const muted = onBeat(S, part('six', 2, 0.5));
  const label = (x, when, text) => `<p class="kicker" style="${at(x, 950, 320)};text-align:center" ${S.rise(when + S.BEAT)}>${text}</p>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 80, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A call under way · L2-029, L2-030</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Six on', { accent: 'the call.' })}</h1>
  </div>
  ${closeup('call-six-top-bar', at(130, 370, 760), pop(S, S.beat(4), { tilt: -1 }))}
  ${closeup('tile-walt', at(140, 590, 320), pop(S, ring, { tilt: -2 }))}
  ${closeup('tile-ruth', at(520, 590, 320), pop(S, avatar, { tilt: 1 }))}
  ${closeup('tile-sam', at(900, 590, 320), pop(S, muted, { tilt: -1 }))}
  ${label(140, ring, 'Speaking: a ring')}
  ${label(520, avatar, 'Camera off')}
  ${label(900, muted, 'Muted')}
  ${one(S, 'call-six-xs', 1380, 90, 440, 0.1, 3)}
  </div>`;
}, { before: 0.3 });

Film.scene('grow', (S) => {
  const three = onBeat(S, said('grow', 1)) - S.BEAT;
  const pane = onBeat(S, said('grow', 2)) - S.BEAT;
  const steps = [three, three + 1.5, pane];
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 1.2)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Two across,', { accent: 'then three.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/call-six-xs.png', width: 390, height: 780 },
      { src: 'shots/call-six-640.png', width: 640, height: 900 },
      { src: 'shots/call-six-l.png', width: 1024, height: 768 },
      { src: 'shots/call-six-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${cut('call-pane', { x: 0, y: 0, w: 640, h: 960, k: 0.62, left: 1480, top: 250, ring: onColour }, S.ref((el, t) => {
    const q = enter(t, pane + 1.3, 0.35, ease.back);
    el.style.opacity = clamp(q * 3);
    el.style.transform = `scale(${lerp(0.6, 1, q)}) rotate(2deg)`;
  }))}
  ${label(S.beat(2), three + 0.6, 'A phone: two across')}
  ${label(three + 0.6, pane + 0.6, 'From 640 px: three across')}
  ${label(pane + 0.6, Infinity, 'From 1280 px: the pane “On the call”')}
  </div>`;
});

Film.scene('two', (S) => {
  const beside = onBeat(S, part('two', 0, 0.55));
  return `
  <div class="fill field--coral">
  <div style="${at(120, 150, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Two people · L2-030</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One above the other,', { accent: 'then side by side.' })}</h1>
  </div>
  ${one(S, 'call-two-xs', 900, 150, 400, 0.1, -2)}
  ${tablet('shots/call-two-640.png', { width: 520, ratio: 640 / 900, style: at(1340, 190, 520), attrs: arrive(S, beside, 2, 10) })}
  <p class="kicker" style="${at(1340, 950, 520)};text-align:center" ${S.rise(beside + S.BEAT)}>From 640 px</p>
  </div>`;
});

// ── Act 3: the controls ─────────────────────────────────────────────────────────────────────────
Film.scene('controls', (S) => {
  const mute = onBeat(S, part('controls', 0, 0.2));
  const camera = onBeat(S, part('controls', 1, 0.2));
  const leave = onBeat(S, said('controls', 2));
  return `
  <div class="fill field--sand">
  ${states(S, ['call-six-xs', 'call-muted-xs', 'call-camera-off-xs', 'left-chat-xs'], [mute, camera, leave], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Call controls · L2-030</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Mute. Camera.', { accent: 'Leave.' })}</h1>
  </div>
  ${closeup('controls', at(820, 480, 640), pop(S, S.beat(3), { tilt: -1.5, until: mute }))}
  ${closeup('controls-muted', at(820, 480, 640), pop(S, mute, { tilt: -1.5, until: camera }))}
  ${closeup('tile-you-muted', at(1520, 440, 320), pop(S, mute + S.BEAT * 2, { tilt: 2, until: camera }))}
  ${closeup('controls-camera-off', at(820, 480, 640), pop(S, camera, { tilt: -1.5, until: leave }))}
  ${closeup('tile-you-camera-off', at(1520, 440, 320), pop(S, camera + S.BEAT * 2, { tilt: 2, until: leave }))}
  <p class="kicker" style="${at(830, 800, 640)}" ${S.ref((el, t) => { el.style.opacity = t >= leave ? 0 : t >= camera ? 1 : enter(t, mute + S.BEAT, 0.3); })}>The control inverts<br>and changes its label</p>
  <div style="${at(820, 470, 900)}" ${S.rise(leave, { y: 60 })}>
    <p class="kicker">“Leave”</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Back to the screen you came from:<br>here, the Everyone thread.</p>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('minimise', (S) => {
  const home = onBeat(S, part('minimise', 0, 0.3));
  const banner = onBeat(S, said('minimise', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Minimise call · L2-030</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Minimise.', { accent: 'Still on the call.' })}</h1>
  </div>
  ${cut('call-six-top-bar', { x: 12, y: 19, w: 90, h: 90, k: 1.6, left: 140, top: 500 }, pop(S, S.beat(3), { tilt: -3 }))}
  <p class="kicker" style="${at(340, 550, 700)}" ${S.rise(S.beat(4))}>“Minimise call”</p>
  ${closeup('banner-return', at(130, 760, 900), pop(S, banner, { tilt: -1.5 }))}
  ${states(S, ['call-six-xs', 'home-return-xs'], [home], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

// ── Act 4: everyone else, and a refusal ─────────────────────────────────────────────────────────
Film.scene('banner', (S) => {
  const appears = onBeat(S, part('banner', 1, 0.12));
  const counts = onBeat(S, part('banner', 1, 0.48));
  const goes = onBeat(S, part('banner', 1, 0.8));
  return `
  <div class="fill field--sun">
  <div style="${at(120, 70, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>For everyone else · L2-029</p>
    <h1 class="headline headline--md" style="margin-top:16px;font-size:84px">${S.words(S.beat(2), 'A banner,', { accent: 'with Join.' })}</h1>
  </div>
  ${closeup('banner-join', at(110, 380, 640) + onSun, pop(S, S.beat(4), { tilt: -1.5 }))}
  ${closeup('banner-1', at(130, 620, 640) + onSun, pop(S, appears, { tilt: 1, until: counts }))}
  ${closeup('banner-2', at(130, 620, 640) + onSun, pop(S, counts, { tilt: 1, until: goes }))}
  <p class="kicker" style="${at(130, 800, 640)}" ${S.ref((el, t) => { el.style.opacity = t >= goes ? 0 : enter(t, appears + S.BEAT, 0.3); })}>It follows the count</p>
  <p class="lede" style="${at(130, 640, 640)};font-weight:700" ${S.rise(goes)}>The last person leaves:<br>the banner goes.</p>
  ${one(S, 'home-banner-xs-dark', 820, 290, 340, 0.1, -2, 'dark')}
  ${one(S, 'chat-banner-xs', 1180, 290, 340, S.beat(3), 0)}
  ${states(S, ['home-banner-gone-xs', 'home-banner-1-xs', 'home-banner-2-xs', 'home-banner-gone-xs'], [appears, counts, goes], { width: 340, style: at(1540, 290, 340), when: onBeat(S, said('banner', 1)) - S.BEAT, tilt: 2 })}
  </div>`;
}, { before: 0.3 });

Film.scene('refused', (S) => `
  <div class="fill field--coral">
  <div style="${at(120, 80, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Microphone and camera refused · L2-029</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Refused?', { accent: 'It says how.' })}</h1>
  </div>
  ${closeup('call-refused-top-bar', at(130, 380, 720) + onColour, pop(S, onBeat(S, part('refused', 0, 0.45)), { tilt: -1.5 }))}
  ${cut('call-refused-xs', { x: 0, y: 590, w: 780, h: 520, k: 0.9, left: 420, top: 540, ring: onColour }, pop(S, onBeat(S, part('refused', 0, 0.7)), { tilt: 1 }))}
  ${one(S, 'call-refused-xs', 1350, 90, 460, 0.1, 3)}
  </div>
`);

// ── Act 5: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Browser', { accent: 'to browser.' })}</h1>
  </div>
  <div style="${at(120, 620, 700)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Calling one person from a direct message.</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'Sound and picture go from browser to browser')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.75)), 'None of it reaches Popkin’s servers')}
    ${fact(S, 3, onBeat(S, part('proof', 0, 1)), 'In this film the cameras are stand-ins: flat colours')}
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
wipeInto('six', 'var(--palette-coral)');
wipeInto('controls', 'var(--palette-teal)');
wipeInto('banner', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
