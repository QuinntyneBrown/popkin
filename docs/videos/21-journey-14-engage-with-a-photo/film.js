// Video 21 · Journey 14: Engage with a photo. Fifteen scenes on a 120 BPM grid (one bar is two
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

/** One phone whose screen changes with a hard cut at each of `cuts`. */
const phones = (S, shots, cuts, { x, y, width, when = 0.1, tilt = 0, theme = 'dark' }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    theme,
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

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:22px;padding:26px 36px;font:700 36px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:60px;height:60px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 32px/60px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: react ────────────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 220, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 14</p>
    <h1 class="headline" style="margin-top:28px">${twoLines(S, S.beat(2), 'Worth', 'a heart?')}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Engage with a photo.</p>
  </div>
  ${one(S, 'view-xs-dark', 1290, 80, 470, S.beat(2), 5)}
  </div>
`);

Film.scene('react', (S) => {
  const tapped = onBeat(S, said('react', 1));
  return `
  <div class="fill field--sand">
  ${phones(S, ['view-xs', 'reacted-xs'], [tapped], { x: 170, y: 74, width: 480, tilt: -3 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Quick reactions · L2-034</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Five, and', { accent: 'more.' })}</h1>
  </div>
  ${closeup('react-bar', at(820, 430, 960), pop(S, S.beat(3), { tilt: -1.5, until: tapped }))}
  ${closeup('react-bar-pressed', at(820, 430, 960), pop(S, tapped, { tilt: 1 }))}
  ${closeup('chip-pressed', at(860, 720, 300), pop(S, tapped + S.BEAT * 2, { tilt: -3 }))}
  <p class="lede" style="${at(1200, 760, 600)};font-weight:700" ${S.rise(tapped + S.BEAT * 2)}>Ten, and pressed</p>
  </div>`;
});

Film.scene('back', (S) => {
  const more = onBeat(S, part('back', 0, 0.45));
  const party = more + S.BEAT * 4;
  return `
  <div class="fill field--teal">
  ${phones(S, ['more-xs', 'party-xs'], [party], { x: 1300, y: 74, width: 480, when: more, tilt: 3 })}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Tap again · L2-034</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Taken', { accent: 'back.' })}</h1>
  </div>
  ${closeup('chip-back', at(140, 420, 360) + onColour, pop(S, S.beat(2), { tilt: -3 }))}
  <p class="lede" style="${at(560, 470, 640)};font-weight:700" ${S.rise(S.beat(3))}>Back to nine</p>
  <p class="lede" style="${at(140, 800, 1000)};font-weight:700" ${S.rise(more)}>More reactions: a party popper 🎉</p>
  </div>`;
});

Film.scene('failed', (S) => `
  <div class="fill field--coral">
  <div style="${at(110, 300, 640)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Not saved · L2-034</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Put', 'back.')}</h1>
  </div>
  ${one(S, 'react-failed-xs', 720, 74, 460, 0.1, -2)}
  ${closeup('react-failed-toast', at(1240, 440, 620) + ';height:96px;object-fit:cover;object-position:0 62%' + onColour, pop(S, onBeat(S, part('failed', 0, 0.55)), { tilt: 2 }))}
  </div>`);

// ── Act 2: comment ──────────────────────────────────────────────────────────────────────────────
Film.scene('comments', (S) => {
  const added = onBeat(S, said('comments', 1));
  return `
  <div class="fill field--paper">
  ${phones(S, ['comments-xs', 'commented-xs'], [added], { x: 170, y: 74, width: 480, tilt: -3 })}
  <div style="${at(800, 160, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Photo comments · L2-035</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'On a phone,', 'a dialog.')}</h1>
    <p class="lede" style="margin-top:40px;font-weight:700" ${S.rise(S.bar(2))}>Oldest first</p>
    <p class="lede" style="margin-top:16px;font-weight:700" ${S.rise(added)}>3 comments → 4 comments</p>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('limit', (S) => {
  const none = onBeat(S, said('limit', 1));
  return `
  <div class="fill field--sun">
  ${one(S, 'comments-empty-xs', 1320, 74, 460, none, 3)}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>500 characters · L2-035</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Say it', { accent: 'in 500.' })}</h1>
  </div>
  ${closeup('near-limit-xs', at(140, 330, 520) + ';object-fit:cover;object-position:bottom;height:620px' + onColour, pop(S, S.beat(3), { tilt: -1.5 }))}
  <p class="lede" style="${at(720, 760, 560)};font-weight:700" ${S.rise(none)}>None yet? Be the first.</p>
  </div>`;
});

Film.scene('own', (S) => {
  const asked = onBeat(S, part('own', 0, 0.5));
  return `
  <div class="fill field--teal">
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your own · L2-035</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Delete,', { accent: 'once sure.' })}</h1>
  </div>
  ${closeup('own-comment', at(130, 400, 760) + onColour, pop(S, S.beat(2), { tilt: -1.5 }))}
  ${one(S, 'delete-comment-xs', 1300, 74, 480, asked, 3)}
  </div>`;
});

Film.scene('panel', (S) => {
  const pane = onBeat(S, part('panel', 0, 0.4));
  return `
  <div class="fill field--night">
  <div style="${at(110, 60, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The side panel · L2-058</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Same comments,', { accent: 'two places.' })}</h1>
  </div>
  ${browser('shots/panel-xl.png', { width: 1220, theme: 'dark', style: at(110, 290, 1220), attrs: arrive(S, S.beat(2), -1, 6) })}
  ${closeup('panel', at(1420, 230, 400), pop(S, pane, { tilt: 1.5 }))}
  </div>`;
}, { before: 0.3 });

// ── Act 3: save and delete ──────────────────────────────────────────────────────────────────────
Film.scene('save', (S) => `
  <div class="fill field--sand">
  <div style="${at(120, 140, 1600)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Save photo · L2-036</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Keep it,', { accent: 'full size.' })}</h1>
  </div>
  ${closeup('bar', at(120, 420, 1680), pop(S, S.beat(3), { tilt: -1 }))}
  <div style="${at(120, 760, 1680)};display:flex;gap:28px">
    ${fact(S, 1, onBeat(S, part('save', 0, 0.35)), 'At the size it was added')}
    ${fact(S, 2, onBeat(S, part('save', 0, 0.7)), 'No location or device data')}
  </div>
  </div>`);

Film.scene('delete', (S) => {
  const asked = onBeat(S, said('delete', 1));
  const gone = onBeat(S, part('delete', 1, 0.55));
  return `
  <div class="fill field--coral">
  ${phones(S, ['actions-xs', 'delete-photo-xs', 'deleted-xs'], [asked, gone], { x: 140, y: 74, width: 480, tilt: -3 })}
  <div style="${at(780, 120, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Photo actions · L2-036</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Yours,', 'or the Host’s.')}</h1>
    <p class="lede" style="margin-top:48px;font-weight:700" ${S.rise(asked)}>Delete this photo?</p>
    <p class="lede" style="margin-top:16px;font-weight:700" ${S.rise(gone)}>Photo deleted.</p>
  </div>
  </div>`;
});

Film.scene('removed', (S) => {
  const viewing = onBeat(S, said('removed', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Everywhere · L2-036</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Photo', { accent: 'removed.' })}</h1>
  </div>
  ${closeup('chat-removed', at(130, 400, 780), pop(S, S.beat(2), { tilt: -1.5 }))}
  ${one(S, 'removed-xs', 1300, 74, 480, viewing, 3)}
  </div>`;
});

// ── Act 4: the form factors, a wrapped-up Popkin, and what no screen shows ──────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, said('grow', 1)) - S.BEAT;
  const p = (t) => [two, two + S.BEAT * 4, two + S.BEAT * 8].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/view-xs.png', width: 390, height: 780 },
      { src: 'shots/view-m.png', width: 768, height: 1024 },
      { src: 'shots/view-l.png', width: 1024, height: 768 },
      { src: 'shots/view-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(S.beat(2), two + 0.6, '390 px: the react bar under the photo')}
  ${label(two + 0.6, two + S.BEAT * 4 + 0.6, '768 px: the photo, the bar under it')}
  ${label(two + S.BEAT * 4 + 0.6, Infinity, 'From 1024 px: the side panel beside it')}
  </div>`;
}, { before: 0.3 });

Film.scene('readonly', (S) => `
  <div class="fill field--night">
  ${browser('shots/wrapped-xl.png', { width: 1180, theme: 'dark', style: at(640, 200, 1180), attrs: arrive(S, 0.1, 1, 6) })}
  <div style="${at(110, 300, 500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrapped up · L2-045</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(1), 'Kept,', 'to read.')}</h1>
  </div>
  </div>`);

Film.scene('proof', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 140, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Nothing', 'left behind.')}</h1>
  </div>
  <div style="${at(860, 170, 960)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'A deleted photo’s file is gone')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.7)), 'Its reactions and comments too')}
    ${fact(S, 3, onBeat(S, said('proof', 1)), 'Only its author deletes a comment')}
    ${fact(S, 4, onBeat(S, part('proof', 1, 0.55)), 'A comment’s text is never logged')}
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
wipeInto('comments', 'var(--palette-coral)');
wipeInto('save', 'var(--palette-teal)');
wipeInto('grow', 'var(--palette-sun)');

Film.start();
