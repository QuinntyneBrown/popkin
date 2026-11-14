// Video 16 · Journey 12: React and reply. Thirteen scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone } = Film;

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
/** Close-ups of one region in one place whose picture changes with a hard cut at each of `cuts`. */
const closeups = (S, shots, cuts, style, when, tilt = -1.5) =>
  shots.map((src, i) => {
    const show = showing(cuts, i);
    return `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${S.ref((el, t) => {
      const p = enter(t, when, 0.35, ease.back);
      el.style.visibility = show(t) ? 'visible' : 'hidden';
      el.style.opacity = clamp(p * 3);
      el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
    })}>`;
  }).join('');
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

// ── Act 1: Message actions and the reactions ────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 12</p>
    <h1 class="headline" style="margin-top:28px">${twoLines(S, S.beat(2), 'Say it,', 'or answer it.')}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>React and reply.</p>
  </div>
  ${one(S, 'chat-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('hold', (S) => {
  const opens = onBeat(S, part('hold', 0, 0.75));
  const quick = onBeat(S, said('hold', 1));
  return `
  <div class="fill field--sand">
  ${phones(S, ['chat-xs', 'actions-xs'], [opens], { x: 170, y: 74, width: 480, tilt: -3 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Message actions · L2-024</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Hold, then', { accent: 'react.' })}</h1>
  </div>
  <p class="kicker" style="${at(820, 370, 900)}" ${during(S, S.beat(3), quick)}>Press and hold, or focus and Enter</p>
  ${closeup('walt-chips', at(820, 430, 800), pop(S, S.beat(3), { tilt: -1.5, until: quick }))}
  <p class="kicker" style="${at(820, 370, 900)}" ${S.rise(quick)}>Five quick reactions</p>
  ${closeup('actions-quick', at(820, 430, 900), pop(S, quick, { tilt: 1 }))}
  <p class="lede" style="${at(840, 690, 960)};font-weight:700" ${S.rise(onBeat(S, part('hold', 1, 0.5)))}>More reactions · Reply · Copy</p>
  </div>`;
});

Film.scene('react', (S) => {
  const picked = onBeat(S, part('react', 0, 0.15));
  const back = onBeat(S, part('react', 1, 0.3));
  return `
  <div class="fill field--teal">
  ${phones(S, ['actions-xs', 'hearted-xs'], [picked], { x: 1300, y: 74, width: 480, tilt: 3 })}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A chip under the message · L2-024</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Yours,', { accent: 'pressed.' })}</h1>
  </div>
  ${closeups(S, ['ruth-before', 'ruth-hearted', 'ruth-back'], [picked, back], at(110, 400, 1000) + onColour, S.beat(3))}
  <p class="kicker" style="${at(130, 780, 600)}" ${during(S, picked, back)}>Heart, you reacted, 1</p>
  ${closeup('chip-heart', at(700, 790, 220) + onColour, pop(S, picked + S.BEAT, { tilt: 3, until: back }))}
  <p class="kicker" style="${at(130, 780, 900)}" ${S.rise(back)}>Chosen again: gone</p>
  </div>`;
});

Film.scene('live', (S) => {
  const others = onBeat(S, said('live', 1));
  return `
  <div class="fill field--paper">
  ${one(S, 'more-xs', 120, 74, 460, 0.1, -2)}
  <div style="${at(700, 60, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>More reactions · L2-024</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Twelve more,', { accent: 'live.' })}</h1>
  </div>
  ${closeup('more-grid', at(700, 360, 600), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${closeup('dev-pancakes', at(1340, 370, 540), pop(S, onBeat(S, part('live', 0, 0.6)), { tilt: 2 }))}
  <p class="kicker" style="${at(760, 690, 900)}" ${S.rise(others)}>Dev laughs, elsewhere: the chip appears</p>
  ${closeup('ruth-live', at(760, 750, 760), pop(S, others + S.BEAT, { tilt: -1 }))}
  </div>`;
});

Film.scene('toasts', (S) => {
  const copied = onBeat(S, said('toasts', 1));
  return `
  <div class="fill field--coral">
  ${one(S, 'failed-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(780, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>When it fails · L2-056</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Back, and', { accent: 'said.' })}</h1>
  </div>
  ${closeup('failed-toast', at(800, 380, 860) + onColour, pop(S, onBeat(S, part('toasts', 0, 0.3)), { tilt: -1.5 }))}
  <p class="kicker" style="${at(820, 680, 760)}" ${S.rise(copied)}>Copy</p>
  ${closeup('copied-toast', at(860, 740, 860) + onColour, pop(S, copied + S.BEAT, { tilt: 1.5 }))}
  </div>`;
});

// ── Act 2: replies, quotes and Delete ───────────────────────────────────────────────────────────
Film.scene('reply', (S) => {
  const sent = onBeat(S, said('reply', 1));
  return `
  <div class="fill field--sand">
  ${phones(S, ['replying-xs', 'replied-xs'], [sent], { x: 170, y: 74, width: 480, tilt: -3 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Reply · L2-025</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Answer', { accent: 'one.' })}</h1>
  </div>
  <p class="kicker" style="${at(820, 370, 900)}" ${S.rise(S.beat(3))}>Above the field</p>
  ${closeup('reply-bar', at(820, 430, 900), pop(S, S.beat(3), { tilt: -1 }))}
  <p class="kicker" style="${at(860, 640, 900)}" ${S.rise(sent)}>Sent, with its quote</p>
  ${closeup('reply-sent', at(860, 700, 820), pop(S, sent + S.BEAT, { tilt: 1.5 }))}
  </div>`;
});

Film.scene('quote', (S) => {
  const marked = onBeat(S, part('quote', 0, 0.35));
  return `
  <div class="fill field--teal">
  <div style="${at(100, 80, 640)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The quote · L2-025</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Choose it,', 'go there.')}</h1>
  </div>
  ${closeup('mara-quote', at(100, 520, 720) + onColour, pop(S, S.beat(3), { tilt: -2 }))}
  ${one(S, 'marked-xs', 880, 74, 460, marked, 2)}
  <p class="kicker" style="${at(1400, 380, 460)}" ${S.rise(marked + S.BEAT)}>Marked for two seconds</p>
  ${closeup('ellie-marked', at(1390, 440, 470) + onColour, pop(S, marked + S.BEAT, { tilt: 1.5 }))}
  </div>`;
});

Film.scene('delete', (S) => {
  const asks = onBeat(S, part('delete', 0, 0.6));
  const gone = onBeat(S, said('delete', 1));
  const label = (x, when, text) => `<p class="kicker" style="${at(x, 1006, 460)};text-align:center" ${S.rise(when)}>${text}</p>`;
  return `
  <div class="fill field--paper">
  <div style="${at(100, 40, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your own message · L2-024, L2-025</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Delete,', { accent: 'asked first.' })}</h1>
  </div>
  ${one(S, 'mine-xs', 180, 250, 380, 0.1, -2)}
  ${label(140, S.beat(2), 'Delete, on your own')}
  ${one(S, 'delete-xs', 770, 250, 380, asks, 1)}
  ${label(730, asks, '“Delete this message?”')}
  ${one(S, 'deleted-quote-xs', 1360, 250, 380, gone, -1)}
  ${label(1320, gone, '“Message deleted”')}
  </div>`;
});

// ── Act 3: a direct message, the form factors and a wrapped-up Popkin ───────────────────────────
Film.scene('dm', (S) => `
  <div class="fill field--coral">
  ${one(S, 'dm-replied-xs', 1330, 66, 470, 0.1, 3)}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A direct message · L2-023</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'The same,', { accent: 'for two.' })}</h1>
  </div>
  ${closeup('dm-laughing', at(130, 380, 860) + onColour, pop(S, onBeat(S, part('dm', 0, 0.2)), { tilt: -1.5 }))}
  ${closeup('dm-reply', at(250, 640, 860) + onColour, pop(S, onBeat(S, part('dm', 0, 0.55)), { tilt: 1.5 }))}
  </div>`);

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
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'From the bottom,', { accent: 'then over.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/actions-xs.png', width: 390, height: 780 },
      { src: 'shots/actions-m.png', width: 768, height: 1024 },
      { src: 'shots/actions-l.png', width: 1024, height: 768 },
      { src: 'shots/actions-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(S.beat(2), two + 0.6, 'A phone: a sheet from the bottom')}
  ${label(two + 0.6, three + 0.6, '768 px: over the thread')}
  ${label(three + 0.6, four + 0.6, '1024 px: the list beside the thread')}
  ${label(four + 0.6, Infinity, '1440 px: and who is here now')}
  </div>`;
}, { before: 0.3 });

Film.scene('readonly', (S) => `
  <div class="fill field--teal">
  <div style="${at(100, 280, 560)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrapped up · L2-045</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(1), 'Kept,', 'not changed.')}</h1>
  </div>
  ${one(S, 'read-only-xs', 660, 74, 460, 0.1, -2)}
  ${closeup('read-only-chips', at(1180, 330, 680) + onColour, pop(S, onBeat(S, part('readonly', 0, 0.3)), { tilt: -1.5 }))}
  ${closeup('read-only-composer', at(1180, 640, 680) + onColour, pop(S, onBeat(S, part('readonly', 0, 0.65)), { tilt: 1.5 }))}
  </div>`);

// ── Act 4: what no screen shows, and the close ──────────────────────────────────────────────────
Film.scene('proof', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 140, 700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Once each,', 'in order.')}</h1>
  </div>
  <div style="${at(860, 170, 960)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.12)), 'One reaction per member per emoji')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.5)), 'A version: an older update never wins')}
    ${fact(S, 3, onBeat(S, said('proof', 1)), 'A direct message: its two members alone')}
    ${fact(S, 4, onBeat(S, part('proof', 1, 0.6)), 'No log carries the emoji')}
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
wipeInto('reply', 'var(--palette-coral)');
wipeInto('dm', 'var(--palette-teal)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
