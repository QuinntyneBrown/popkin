// Video 18 · Journey 13: Photos in chat. Eleven scenes on a 120 BPM grid (one bar is two seconds).
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

/** States in one place whose picture changes with a hard cut at each of `cuts` (scene seconds). */
const showing = (cuts, i) => (t) => cuts.filter((c) => t >= c).length === i;

/** One phone whose screen changes with a hard cut at each of `cuts`. */
const phones = (S, shots, cuts, { x, y, width, when = 0.1, tilt = 0 }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    style: at(x, y, width),
    attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8, showing(cuts, i)),
  })).join('');

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/** On a coral, sun or teal field the accent ring would vanish: the ring is white there. */
const onColour = ';outline-color:var(--palette-white)';

/** Words of the film's own that are on screen from `from` until `until` (scene seconds). */
const during = (S, from, until) => S.ref((el, t) => {
  const p = enter(t, from, 0.3);
  el.style.opacity = t >= until ? 0 : p;
  el.style.transform = `translateY(${(1 - p) * 40}px)`;
});

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:22px;padding:26px 36px;font:700 36px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:60px;height:60px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 32px/60px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: choose, send, refuse, receive ────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 210, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 13</p>
    <h1 class="headline" style="margin-top:28px">${twoLines(S, S.beat(2), 'Show them,', 'in the thread.')}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Photos in chat.</p>
  </div>
  ${one(S, 'chat-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('choose', (S) => {
  const picked = onBeat(S, part('choose', 0, 0.55));
  const waits = onBeat(S, said('choose', 1));
  return `
  <div class="fill field--sand">
  ${phones(S, ['chat-xs', 'picked-xs'], [picked], { x: 170, y: 74, width: 480, tilt: -3 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Photo · L2-026</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Pick one,', { accent: 'see it.' })}</h1>
  </div>
  <p class="kicker" style="${at(820, 400, 900)}" ${during(S, S.beat(3), waits)}>The camera in the field: Photo</p>
  ${closeup('composer', at(820, 470, 900), pop(S, S.beat(3), { tilt: -1.5, until: picked }))}
  ${closeup('picked-composer', at(820, 470, 900), pop(S, picked, { tilt: 1 }))}
  <p class="kicker" style="${at(840, 900, 900)}" ${S.rise(waits)}>Above the field, with Remove photo</p>
  </div>`;
});

Film.scene('send', (S) => {
  const bare = onBeat(S, part('send', 0, 0.25));
  return `
  <div class="fill field--teal">
  ${one(S, 'sent-xs', 1300, 74, 480, 0.1, 3)}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>In the thread · L2-026</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'With words,', { accent: 'or without.' })}</h1>
  </div>
  ${closeup('sent-with-text', at(110, 400, 560) + onColour, pop(S, S.beat(3), { tilt: -2 }))}
  ${closeup('sent-no-text', at(720, 430, 520) + onColour, pop(S, bare, { tilt: 2 }))}
  <p class="lede" style="${at(130, 880, 1100)};font-weight:700" ${S.rise(onBeat(S, part('send', 0, 0.55)))}>At most 16 rem wide · 4:3 · text under it</p>
  </div>`;
});

Film.scene('refused', (S) => {
  const type = onBeat(S, said('refused', 1));
  return `
  <div class="fill field--coral">
  ${one(S, 'refused-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(780, 70, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The limits · L2-031</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Refused,', { accent: 'saying why.' })}</h1>
  </div>
  <p class="kicker" style="${at(820, 380, 760)}" ${S.rise(onBeat(S, part('refused', 0, 0.3)))}>Over 10 MB</p>
  ${closeup('refused-size', at(800, 440, 960) + onColour, pop(S, onBeat(S, part('refused', 0, 0.3)), { tilt: -1.5 }))}
  <p class="kicker" style="${at(840, 700, 760)}" ${S.rise(type)}>Not a JPEG, PNG, WebP or HEIC photo</p>
  ${closeup('refused-type', at(860, 760, 940) + onColour, pop(S, type + S.BEAT, { tilt: 1.5 }))}
  </div>`;
});

Film.scene('live', (S) => `
  <div class="fill field--paper">
  <div style="${at(110, 300, 620)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Live · L2-027</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'As it’s', 'sent.')}</h1>
  </div>
  ${one(S, 'live-xs', 720, 74, 460, 0.1, -2)}
  <p class="kicker" style="${at(1250, 300, 560)}" ${S.rise(onBeat(S, part('live', 0, 0.45)))}>Walt’s, no reload</p>
  ${closeup('walt-live', at(1250, 360, 600), pop(S, onBeat(S, part('live', 0, 0.45)), { tilt: 2 }))}
  </div>`);

// ── Act 2: full screen, and a direct message ────────────────────────────────────────────────────
Film.scene('open', (S) => {
  const big = S.bar(1);
  const panel = onBeat(S, part('open', 1, 0.5));
  return `
  <div class="fill field--night">
  <div style="${at(110, 60, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The photo view · L2-026, L2-033</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Choose it,', { accent: 'full screen.' })}</h1>
  </div>
  ${browser('shots/view-xl.png', { width: 1180, theme: 'dark', style: at(640, 290, 1180), attrs: arrive(S, big, 1, 6) })}
  ${one(S, 'view-xs', 140, 250, 400, 0.1, -3, 'dark')}
  <p class="kicker" style="${at(1320, 70, 520)}" ${S.rise(panel)}>Dev’s, from 1024 px</p>
  ${closeup('view-by', at(1320, 130, 520), pop(S, panel, { tilt: -1.5 }))}
  </div>`;
});

Film.scene('dm', (S) => `
  <div class="fill field--coral">
  ${one(S, 'dm-xs', 1330, 66, 470, 0.1, 3)}
  <div style="${at(110, 70, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A direct message · L2-023, L2-026</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Just', { accent: 'you two.' })}</h1>
  </div>
  ${closeup('dm-photo', at(130, 400, 760) + onColour, pop(S, onBeat(S, part('dm', 0, 0.2)), { tilt: -1.5 }))}
  <p class="lede" style="${at(140, 940, 1100)};font-weight:700" ${S.rise(onBeat(S, part('dm', 0, 0.6)))}>Not in Photos · only the two open it</p>
  </div>`);

// ── Act 3: the form factors, and a wrapped-up Popkin ────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, said('grow', 1));
  const three = two + S.BEAT * 4;
  const four = three + S.BEAT * 4;
  const p = (t) => [two, three, four].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/preview-xs.png', width: 390, height: 780 },
      { src: 'shots/preview-m.png', width: 768, height: 1024 },
      { src: 'shots/preview-l.png', width: 1024, height: 768 },
      { src: 'shots/preview-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(S.beat(2), two + 0.6, '390 px: the thread, the photo above the field')}
  ${label(two + 0.6, three + 0.6, '768 px: the rail')}
  ${label(three + 0.6, four + 0.6, '1024 px: the conversations beside the thread')}
  ${label(four + 0.6, Infinity, '1440 px: and who is here now')}
  </div>`;
}, { before: 0.3 });

Film.scene('readonly', (S) => `
  <div class="fill field--teal">
  <div style="${at(100, 280, 560)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrapped up · L2-045</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(1), 'Kept,', 'still open.')}</h1>
  </div>
  ${one(S, 'read-only-xs', 660, 74, 460, 0.1, -2)}
  ${closeup('dev-photo', at(1180, 220, 600) + onColour, pop(S, onBeat(S, part('readonly', 0, 0.2)), { tilt: -1.5 }))}
  ${closeup('read-only-composer', at(1180, 760, 680) + onColour, pop(S, onBeat(S, part('readonly', 0, 0.65)), { tilt: 1.5 }))}
  </div>`);

// ── Act 4: what no screen shows, and the close ──────────────────────────────────────────────────
Film.scene('proof', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 140, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Under', 'the hood.')}</h1>
  </div>
  <div style="${at(860, 170, 960)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.15)), 'No location or device data kept')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.65)), 'A signed address that expires')}
    ${fact(S, 3, onBeat(S, said('proof', 1)), 'The file’s own bytes are checked')}
    ${fact(S, 4, onBeat(S, part('proof', 1, 0.55)), 'Tried again: not uploaded twice')}
  </div>
  </div>`, { before: 0.3 });

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
wipeInto('open', 'var(--palette-coral)');
wipeInto('grow', 'var(--palette-teal)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
