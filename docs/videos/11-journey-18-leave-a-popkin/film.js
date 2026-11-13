// Video 11 · Journey 18: Leave a Popkin. Eight scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts being spoken. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;
const twoLines = (S, when, text, accent) => `${S.words(when, text)}<br>${S.words(when + 0.1, '', { accent })}`;

/** A device that rises into place at `when`, drawn only while show(t) is true. */
const arrive = (S, when, tilt = 0, from = 12, show = () => true) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.visibility = show(t) ? 'visible' : 'hidden';
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });

const one = (S, src, x, y, width, when, tilt, theme = 'light', show) =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8, show) });

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
const onColour = ';outline-color:var(--palette-white)';

const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: the member asks to leave ─────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 220, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 18</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Time to', { accent: 'go.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Leave a Popkin.</p>
  </div>
  ${one(S, 'home-member-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('menu', (S) => {
  const leave = onBeat(S, part('menu', 0, 0.7));
  return `
  <div class="fill field--sand">
  ${one(S, 'settings-member-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Popkin settings · L2-020</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'A member’s', { accent: 'menu.' })}</h1>
  </div>
  ${closeup('settings-member-menu', at(820, 400, 900), pop(S, onBeat(S, part('menu', 0, 0.4)), { tilt: -1, until: leave }))}
  ${closeup('settings-leave', at(820, 470, 960), pop(S, leave, { tilt: 1.5 }))}
  <p class="kicker" style="${at(830, 760, 900)}" ${S.rise(leave + S.BEAT)}>The danger row: never the Host’s</p>
  </div>`;
});

Film.scene('ask', (S) => {
  const desc = onBeat(S, part('ask', 0, 0.3));
  const actions = onBeat(S, said('ask', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(110, 70, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Leave Popkin · L2-047</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'What', { accent: 'stays.' })}</h1>
  </div>
  ${closeup('leave-heading', at(120, 400, 760), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${closeup('leave-description', at(120, 560, 760), pop(S, desc, { tilt: 1 }))}
  ${closeup('leave-actions', at(170, 780, 640), pop(S, actions, { tilt: -1 }))}
  ${browser('shots/leave-xl.png', { width: 900, style: at(960, 260, 900), attrs: arrive(S, 0.2, 1.5, 6) })}
  </div>`;
}, { before: 0.3 });

// ── Act 2: gone, and one fewer ──────────────────────────────────────────────────────────────────
Film.scene('gone', (S) => {
  const list = onBeat(S, said('gone', 1));
  return `
  <div class="fill field--coral">
  <div style="${at(110, 70, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>My Popkins · L2-047</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Gone from', 'the list.')}</h1>
  </div>
  <p class="kicker" style="${at(120, 480, 700)}" ${S.rise(S.beat(2))}>While it goes through</p>
  ${closeup('leave-busy', at(120, 540, 700) + onColour, pop(S, S.beat(2), { tilt: -1.5 }))}
  ${one(S, 'leave-xs', 1000, 80, 440, 0.1, -2, 'light', (t) => t < list)}
  ${one(S, 'gone-xs', 900, 80, 440, list, -2)}
  ${tablet('shots/gone-m.png', { width: 480, style: at(1370, 300, 480), attrs: arrive(S, list + S.BEAT * 2, 4, 10) })}
  </div>`;
}, { before: 0.3 });

Film.scene('fewer', (S) => {
  const after = onBeat(S, part('fewer', 0, 0.75));
  return `
  <div class="fill field--teal">
  ${one(S, 'host-before-xs', 1300, 74, 480, 0.1, 3, 'light', (t) => t < after)}
  ${one(S, 'host-after-xs', 1300, 74, 480, after, 3)}
  <div style="${at(120, 80, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Everyone else · L2-047</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'One', { accent: 'fewer.' })}</h1>
  </div>
  ${closeup('count-before', at(140, 460, 520) + onColour, pop(S, S.beat(3), { tilt: -2, until: after }))}
  ${closeup('count-after', at(140, 460, 520) + onColour, pop(S, after, { tilt: 2 }))}
  <p class="lede" style="${at(140, 760, 900)};font-weight:700" ${S.rise(after + S.BEAT)}>Live, without a reload.</p>
  </div>`;
});

// ── Act 3: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const steps = [S.bar(1), S.bar(2), S.bar(3)];
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Every', { accent: 'width.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/gone-xs.png', width: 390, height: 780 },
      { src: 'shots/gone-m.png', width: 768, height: 1024 },
      { src: 'shots/gone-l.png', width: 1024, height: 768 },
      { src: 'shots/gone-xl.png', width: 1440, height: 900 },
    ], p, { height: 800 })}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 4: what no screen shows, and the close ──────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const failed = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 90, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'The Host', 'stays.')}</h1>
  </div>
  ${closeup('settings-host-menu', at(120, 470, 700), pop(S, S.beat(3), { tilt: -1.5, until: failed }))}
  ${closeup('leave-failed', at(120, 520, 700), pop(S, failed, { tilt: 1 }))}
  <div style="${at(900, 220, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.15)), 'The Host has no way to leave, even by hand')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.55)), 'After leaving, everything in it is not found')}
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
wipeInto('gone', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-teal)');

Film.start();
