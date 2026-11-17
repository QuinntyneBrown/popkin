// Video 22 · Journey 22: Find a free evening. Thirteen scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
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
const one = (S, src, x, y, width, when, tilt, theme = 'dark') =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });

/** States in one place whose picture changes with a hard cut at each of `cuts` (scene seconds). */
const showing = (cuts, i) => (t) => cuts.filter((c) => t >= c).length === i;

/** One browser window whose screen changes with a hard cut at each of `cuts`. */
const windows = (S, shots, cuts, { x, y, width, when = 0.1, tilt = 0, theme = 'light' }) =>
  shots.map((src, i) => browser(`shots/${src}.png`, {
    width,
    theme,
    style: at(x, y, width),
    attrs: arrive(S, when, tilt, tilt + 6, showing(cuts, i)),
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

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:22px;padding:26px 36px;font:700 36px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:60px;height:60px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 32px/60px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: time off ─────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 220, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 22</p>
    <h1 class="headline" style="margin-top:28px">${twoLines(S, S.beat(2), 'Everyone', 'free?')}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Find a free evening.</p>
  </div>
  ${one(S, 'timeoff-xs-dark', 1290, 80, 470, S.beat(2), 5)}
  </div>
`);

Film.scene('timeoff', (S) => {
  const counts = onBeat(S, said('timeoff', 1));
  return `
  <div class="fill field--sand">
  ${browser('shots/timeoff-xl.png', { width: 1200, style: at(80, 250, 1200), attrs: arrive(S, 0.1, -1, 5) })}
  <div style="${at(1340, 120, 520)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Time off · L2-072</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Who’s', 'off when.')}</h1>
  </div>
  ${closeup('legend', at(1340, 560, 500), pop(S, S.bar(2), { tilt: 1.5 }))}
  ${closeup('week-head', at(140, 120, 1100), pop(S, counts, { tilt: -1 }))}
  </div>`;
});

Film.scene('add', (S) => {
  const saved = onBeat(S, said('add', 1));
  return `
  <div class="fill field--teal">
  ${windows(S, ['add-l', 'after-l'], [saved], { x: 760, y: 200, width: 1080, tilt: 1 })}
  <div style="${at(110, 120, 600)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Add my time off · L2-073</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Your own', 'week.')}</h1>
  </div>
  ${closeup('leave-row', at(110, 560, 600) + onColour, pop(S, S.bar(1), { tilt: -2, until: saved }))}
  ${closeup('mara-after', at(110, 600, 600) + onColour, pop(S, saved + S.BEAT, { tilt: -2 }))}
  </div>`;
});

// ── Act 2: this week ────────────────────────────────────────────────────────────────────────────
Film.scene('thisweek', (S) => {
  const wed = onBeat(S, said('thisweek', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(110, 70, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>This week · L2-074</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Seven', { accent: 'evenings.' })}</h1>
  </div>
  ${closeup('days', at(110, 360, 1700), pop(S, S.beat(3), { tilt: -1 }))}
  ${closeup('free', at(260, 640, 1400), pop(S, wed, { tilt: 1 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('shifts', (S) => `
  <div class="fill field--night">
  <div style="${at(110, 70, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Who works when · L2-074</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Noon to', { accent: 'midnight.' })}</h1>
  </div>
  ${closeup('shifts', at(110, 330, 1700), pop(S, S.beat(3), { tilt: -1 }))}
  </div>`);

Film.scene('hours', (S) => `
  <div class="fill field--sun">
  ${one(S, 'hours-xs', 1300, 74, 480, 0.1, 3)}
  <div style="${at(110, 300, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>My hours · L2-074</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Two stretches,', 'quarter hours.')}</h1>
  </div>
  </div>`);

Film.scene('dinner', (S) => {
  const ask = onBeat(S, said('dinner', 1));
  return `
  <div class="fill field--coral">
  ${one(S, 'draft-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(780, 90, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Plan dinner in chat · L2-074</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'A draft,', 'not sent.')}</h1>
  </div>
  ${closeup('draft', at(780, 470, 1060) + onColour, pop(S, S.bar(1), { tilt: 1, until: ask }))}
  ${closeup('ask', at(780, 470, 1060) + onColour, pop(S, ask, { tilt: -1 }))}
  </div>`;
});

// ── Act 3: the home, the event and the form factors ─────────────────────────────────────────────
Film.scene('home', (S) => `
  <div class="fill field--paper">
  ${browser('shots/home-xl.png', { width: 1200, style: at(640, 200, 1200), attrs: arrive(S, 0.1, 1, 6) })}
  <div style="${at(110, 120, 500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Home · L2-075</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Next', 'free evening.')}</h1>
  </div>
  ${closeup('home-card', at(110, 600, 640), pop(S, S.bar(1), { tilt: -2 }))}
  </div>`, { before: 0.3 });

Film.scene('event', (S) => `
  <div class="fill field--teal">
  ${one(S, 'event-xs', 1300, 74, 480, 0.1, 3)}
  <div style="${at(110, 300, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Set the event · L2-085</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'What we’re', 'here for.')}</h1>
  </div>
  </div>`);

Film.scene('grow', (S) => {
  const two = onBeat(S, said('grow', 1)) - S.BEAT;
  const p = (t) => [two, two + S.BEAT * 4, two + S.BEAT * 8].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/week-xs.png', width: 390, height: 780 },
      { src: 'shots/week-m.png', width: 768, height: 1024 },
      { src: 'shots/week-l.png', width: 1024, height: 768 },
      { src: 'shots/week-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(S.beat(2), two + 0.6, '390 px: one column, the action under the headline')}
  ${label(two + 0.6, two + S.BEAT * 4 + 0.6, '768 px: the tabs become a rail')}
  ${label(two + S.BEAT * 4 + 0.6, Infinity, 'From 1024 px: the action beside the headline')}
  </div>`;
}, { before: 0.3 });

Film.scene('off', (S) => `
  <div class="fill field--night">
  ${one(S, 'off-xs', 1300, 74, 480, 0.1, 3)}
  <div style="${at(110, 260, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Features:Schedules · L2-077</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Off,', 'nothing lost.')}</h1>
  </div>
  </div>`);

Film.scene('proof', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 140, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Yours', 'to change.')}</h1>
  </div>
  <div style="${at(860, 200, 960)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'Only your own row, refused with 403')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.7)), 'Read only once wrapped up')}
    ${fact(S, 3, onBeat(S, said('proof', 1)), 'Live on ScheduleChanged')}
  </div>
  </div>`, { before: 0.3 });

Film.scene('close', (S) => `
  <div class="fill field--night">${S.aurora((t) => 1 - exit(t, S.length - 2.5, 2.5) * 0.6)}
  <div style="position:absolute;left:0;right:0;top:360px;text-align:center">
    <p class="wordmark" ${S.rise(S.beat(1), { y: 40 })}>Popkin</p>
    <p class="lede" style="margin-top:48px" ${S.rise(S.bar(1))}>A platform for pop-up communities.</p>
  </div>
  </div>
`);

// A change of act is a wipe in a Popkin colour; inside an act the cuts are hard.
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('thisweek', 'var(--palette-coral)');
wipeInto('home', 'var(--palette-teal)');

Film.start();
