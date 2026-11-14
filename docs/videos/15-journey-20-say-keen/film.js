// Video 15 · Journey 20: Say keen. Nine scenes on a 120 BPM grid (one bar is two seconds). Every
// picture is a screenshot of the running app from shots.ts; every position is a pure function of
// the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it: a cut belongs on the grid. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;

/** A device that rises into place at `when` and settles at `tilt` degrees; drawn while show(t). */
const arrive = (S, when, tilt = 0, from = 12, show = () => true) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.visibility = show(t) ? 'visible' : 'hidden';
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });

/** One phone, without its notch; with `show`, one of several states in the same place. */
const one = (S, src, x, y, width, when, tilt, { theme = 'light', show } = {}) =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8, show) });

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/** On a coral or teal field the accent ring would vanish: the ring is white there. */
const onColour = ';outline-color:var(--palette-white)';

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

/** A big number that changes on a beat: `steps` is [[from, text], …] in scene seconds. */
const counter = (S, steps, style) => `<p class="headline" style="${style}" ${S.ref((el, t) => {
  const shown = steps.filter(([from]) => t >= from).at(-1);
  el.style.opacity = shown ? 1 : 0;
  el.textContent = shown ? shown[1] : '';
  const kick = shown ? Math.exp(-(t - shown[0]) * 8) : 0;
  el.style.transform = `scale(${1 + kick * 0.18})`;
})}></p>`;

// ── Act 1: an idea, and who is keen ─────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 220, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 20</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Say you’re', { accent: 'keen.' })}</h1>
  </div>
  ${one(S, 'want-xs-dark', 1290, 80, 470, S.beat(2), 5, { theme: 'dark' })}
  </div>
`);

Film.scene('idea', (S) => {
  const faces = onBeat(S, said('idea', 1));
  return `
  <div class="fill field--sand">
  ${one(S, 'want-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Want to do · L2-042</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Keen to', { accent: 'do this?' })}</h1>
  </div>
  ${closeup('panel-want', at(830, 390, 900), pop(S, onBeat(S, part('idea', 0, 0.6)), { tilt: -1.5 }))}
  <p class="kicker" style="${at(840, 880, 900)}" ${S.rise(faces)}>Four faces · +3 · 7 keen</p>
  </div>`;
});

Film.scene('press', (S) => {
  const pressed = onBeat(S, part('press', 0, 0.3));
  return `
  <div class="fill field--teal">
  <div style="${at(110, 80, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>I’m keen · L2-042</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Pressed, and', { accent: 'said.' })}</h1>
  </div>
  ${closeup('button-im-keen', at(140, 470, 640) + onColour, pop(S, S.beat(3), { tilt: -2, until: pressed }))}
  ${closeup('button-youre-keen', at(140, 470, 720) + onColour, pop(S, pressed, { tilt: -2 }))}
  ${counter(S, [[S.beat(3), '7 keen'], [onBeat(S, part('press', 0, 0.85)), '8 keen']], at(150, 800, 800) + ';font-size:130px;transform-origin:left center')}
  ${one(S, 'keen-xs', 1240, 74, 480, pressed, 3)}
  </div>`;
});

Film.scene('undo', (S) => `
  <div class="fill field--paper">
  ${closeup('panel-keen', at(120, 330, 820), pop(S, S.beat(1), { tilt: -1.5, until: onBeat(S, part('undo', 0, 0.55)) }))}
  ${closeup('panel-back', at(120, 330, 820), pop(S, onBeat(S, part('undo', 0, 0.55)), { tilt: 1.5 }))}
  <div style="${at(1040, 300, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>You’re keen · L2-042</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Changed your', { accent: 'mind?' })}</h1>
    <p class="lede" style="margin-top:36px;font-weight:700" ${S.rise(onBeat(S, part('undo', 0, 0.6)))}>8 keen, back to 7.</p>
  </div>
  </div>`);

// ── Act 2: we did this ──────────────────────────────────────────────────────────────────────────
Film.scene('done', (S) => {
  const turned = onBeat(S, said('done', 1));
  return `
  <div class="fill field--coral">
  ${one(S, 'own-xs', 110, 74, 470, 0.1, -3, { show: (t) => t < turned })}
  ${one(S, 'done-xs', 110, 74, 470, turned, -3)}
  <div style="${at(680, 70, 1180)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The sharer or the Host · L2-042</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'We did', { accent: 'this.' })}</h1>
  </div>
  ${closeup('panel-own', at(700, 380, 860) + onColour, pop(S, onBeat(S, part('done', 0, 0.5)), { tilt: -1.5, until: turned }))}
  ${closeup('done-kind', at(720, 360, 620) + onColour, pop(S, turned, { tilt: 1 }))}
  ${closeup('done-rate', at(760, 520, 820) + onColour, pop(S, onBeat(S, part('done', 1, 0.5)), { tilt: -1 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('list', (S) => `
  <div class="fill field--sand">
  ${browser('shots/list-want-xl.png', { width: 1240, style: at(70, 150, 1240), attrs: arrive(S, 0.1, 0, 3) })}
  <div style="${at(1360, 120, 500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The list · L2-037</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), '7', { accent: 'keen.' })}</h1>
  </div>
  ${closeup('card-beach', at(1420, 330, 360), pop(S, onBeat(S, part('list', 0, 0.5)), { tilt: 2 }))}
  </div>`);

// ── Act 3: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, said('grow', 1)) - S.BEAT;
  const p = (t) => [two, two + S.BEAT * 2, two + S.BEAT * 4].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Under it,', { accent: 'then beside.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/want-xs.png', width: 390, height: 780 },
      { src: 'shots/want-m.png', width: 768, height: 1024 },
      { src: 'shots/want-l.png', width: 1024, height: 768 },
      { src: 'shots/want-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(S.beat(2), two + 0.6, 'A phone: the panel under the picture')}
  ${label(two + 0.6, two + S.BEAT * 4 + 0.6, 'From 1024 px: beside the picture')}
  ${label(two + S.BEAT * 4 + 0.6, Infinity, '1440 px')}
  </div>`;
}, { before: 0.3 });

// ── Act 4: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Keen', { accent: 'once.' })}</h1>
  </div>
  <div style="${at(900, 160, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.2)), 'Saying it twice changes nothing')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.6)), 'Only the sharer or the Host marks it done')}
  </div>
  <div style="${at(900, 600, 900)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">The count changing live.<br>Comments on an idea.</p>
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
wipeInto('done', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
