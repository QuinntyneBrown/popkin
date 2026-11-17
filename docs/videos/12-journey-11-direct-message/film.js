// Video 11 · Journey 11: Direct message. Eleven scenes on a 120 BPM grid (one bar is two
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

/** States in one place whose picture changes with a hard cut at each of `cuts` (scene seconds). */
const showing = (cuts, i) => (t) => cuts.filter((c) => t >= c).length === i;

/** One phone whose screen changes with a hard cut at each of `cuts`. */
const phones = (S, shots, cuts, { x, y, width, when = 0.1, tilt = 0 }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    style: at(x, y, width),
    attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8, showing(cuts, i)),
  })).join('');

/** One browser window whose page changes with a hard cut at each of `cuts`. */
const pages = (S, shots, cuts, { width, style, when = 0 }) =>
  shots.map((src, i) => browser(`shots/${src}.png`, {
    width,
    style,
    attrs: arrive(S, when, 0, 3, showing(cuts, i)),
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
 * `k` film pixels to each of them, at left, top.
 */
const cut = (src, { x, y, w, h, k, left, top, ring = '' }, attrs) =>
  `<div class="closeup" style="position:absolute;left:${left}px;top:${top}px;width:${w * k}px;height:${h * k}px;overflow:hidden${ring}" ${attrs}>` +
  `<img src="shots/${src}.png" alt="" style="position:absolute;left:${-x}px;top:${-y}px;zoom:${k}"></div>`;
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
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: the Chat tab, New message, and the direct message ────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 11</p>
    <h1 class="headline" style="margin-top:28px">${twoLines(S, S.beat(2), 'Two of you.', 'Nobody else.')}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Direct message.</p>
  </div>
  ${one(S, 'list-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('list', (S) => {
  const direct = onBeat(S, said('list', 1));
  const unread = onBeat(S, part('list', 1, 0.62));
  return `
  <div class="fill field--sand">
  ${one(S, 'list-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The Chat tab · L2-022</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Everyone', { accent: 'first.' })}</h1>
  </div>
  ${closeup('everyone', at(820, 380, 760), pop(S, onBeat(S, part('list', 0, 0.3)), { tilt: -1.5, until: direct }))}
  ${closeup('direct-label', at(820, 370, 600), pop(S, direct, { tilt: 1 }))}
  ${closeup('row-walt', at(840, 560, 900), pop(S, unread, { tilt: -1.5 }))}
  <p class="kicker" style="${at(850, 820, 900)}" ${S.rise(unread + S.BEAT)}>Unread: the name in bold, and a dot</p>
  </div>`;
});

Film.scene('newmsg', (S) => {
  const tomas = onBeat(S, part('newmsg', 1, 0.3));
  const bren = onBeat(S, part('newmsg', 1, 0.55));
  const walt = onBeat(S, part('newmsg', 1, 0.86));
  const label = (x, when, text) => `<p class="kicker" style="${at(x, 1006, 380)};text-align:center" ${S.rise(when)}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <div style="${at(100, 40, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>New message · L2-022</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Find', { accent: 'anyone.' })}</h1>
  </div>
  ${one(S, 'new-message-xs', 100, 250, 380, 0.1, -2)}
  ${label(100, S.beat(2), 'The other members')}
  ${one(S, 'search-tomas-xs', 540, 250, 380, tomas, 1)}
  ${label(540, tomas, '“tomas”')}
  ${one(S, 'search-bren-xs', 980, 250, 380, bren, -1)}
  ${label(980, bren, '“BREN”')}
  ${one(S, 'chosen-walt-xs', 1420, 250, 380, walt, 2)}
  ${label(1420, walt, 'Walt')}
  </div>`;
});

Film.scene('dm', (S) => `
  <div class="fill field--paper">
  ${one(S, 'dm-xs', 1330, 66, 470, 0.1, 3)}
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The direct message · L2-023</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Only you', { accent: 'two.' })}</h1>
  </div>
  ${closeup('dm-top-bar', at(110, 360, 1100), pop(S, onBeat(S, part('dm', 0, 0.15)), { tilt: -1 }))}
  ${closeup('dm-intro', at(330, 620, 720), pop(S, onBeat(S, said('dm', 1)), { tilt: 1.5 }))}
  </div>`);

Film.scene('talk', (S) => {
  const sent = onBeat(S, part('talk', 0, 0.45));
  const reply = onBeat(S, said('talk', 1));
  return `
  <div class="fill field--coral">
  ${phones(S, ['talk-typed-xs', 'talk-sent-xs', 'talk-reply-xs'], [sent, reply], { x: 150, y: 74, width: 480, tilt: -3 })}
  <div style="${at(780, 80, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Between the two · L2-023</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(1), 'Private, and', { accent: 'live.' })}</h1>
  </div>
  <p class="kicker" style="${at(800, 380, 760)}" ${S.rise(sent)}>You</p>
  ${closeup('talk-mine', at(800, 430, 760) + onColour, pop(S, sent, { tilt: -1.5 }))}
  <p class="kicker" style="${at(900, 680, 760)}" ${S.rise(reply)}>Walt, without reloading</p>
  ${closeup('talk-reply', at(900, 730, 760) + onColour, pop(S, reply, { tilt: 1.5 }))}
  </div>`;
});

// ── Act 2: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, part('grow', 0, 0.55));
  const three = onBeat(S, said('grow', 1));
  const four = onBeat(S, said('grow', 2));
  const pane = four + S.BEAT * 4;
  const p = (t) => [two, three, four].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Wider,', { accent: 'side by side.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/dm-mock-xs.png', width: 390, height: 780 },
      { src: 'shots/dm-m.png', width: 768, height: 1024 },
      { src: 'shots/dm-l.png', width: 1024, height: 768 },
      { src: 'shots/dm-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${cut('person-pane', { x: 0, y: 0, w: 640, h: 500, k: 0.78, left: 1380, top: 300, ring: onColour }, pop(S, pane, { tilt: 2 }))}
  ${label(S.beat(2), two + 0.6, 'A phone: the thread fills the screen')}
  ${label(two + 0.6, three + 0.6, '768 px: still the thread alone')}
  ${label(three + 0.6, four + 0.6, 'From 1024 px: the list beside the thread')}
  ${label(four + 0.6, Infinity, 'From 1280 px: “About Walt”, with Call Walt')}
  </div>`;
}, { before: 0.3 });

// ── Act 3: Call Walt, the answer, and a wrapped-up Popkin ───────────────────────────────────────
Film.scene('call', (S) => {
  const open = onBeat(S, part('call', 0, 0.3));
  const alone = onBeat(S, said('call', 1));
  const controls = onBeat(S, part('call', 1, 0.6));
  return `
  <div class="fill field--sand">
  <div style="${at(110, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Call Walt · L2-030</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Call', { accent: 'Walt.' })}</h1>
  </div>
  ${closeup('dm-call', at(130, 360, 220), pop(S, S.beat(2), { tilt: -3 }))}
  <p class="kicker" style="${at(400, 440, 600)}" ${S.rise(S.beat(3))}>At the top of the thread</p>
  ${closeup('call-alone-top-bar', at(110, 640, 900), pop(S, alone, { tilt: -1 }))}
  ${closeup('call-controls', at(300, 830, 560), pop(S, controls, { tilt: 1.5 }))}
  ${one(S, 'call-alone-xs', 1330, 66, 470, open, 3)}
  </div>`;
});

Film.scene('answer', (S) => {
  const banner = onBeat(S, part('answer', 0, 0.55));
  const joined = onBeat(S, said('answer', 1));
  const only = onBeat(S, part('answer', 1, 0.5));
  return `
  <div class="fill field--coral">
  ${pages(S, ['dm-banner-xl', 'call-two-xl'], [joined], { width: 1120, style: at(80, 220, 1120), when: 0.1 })}
  <div style="${at(100, 40, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A call between the two · L2-030</p>
    <h1 class="headline headline--md" style="margin-top:14px">${S.words(S.beat(2), 'Just the', { accent: 'two of you.' })}</h1>
  </div>
  <p class="kicker" style="${at(1270, 300, 580)}" ${during(S, banner, joined)}>In the direct message</p>
  ${closeup('banner', at(1270, 360, 580) + onColour, pop(S, banner, { tilt: -1.5, until: joined }))}
  ${closeup('call-two-top-bar', at(1250, 330, 600) + onColour, pop(S, joined + S.BEAT, { tilt: 1 }))}
  ${cut('call-two-pane', { x: 0, y: 0, w: 640, h: 440, k: 0.86, left: 1280, top: 540, ring: onColour }, pop(S, only, { tilt: -1.5 }))}
  </div>`;
});

Film.scene('readonly', (S) => `
  <div class="fill field--teal">
  <div style="${at(100, 280, 560)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrapped up · L2-023</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(1), 'Then,', 'read-only.')}</h1>
  </div>
  ${one(S, 'read-only-xs', 660, 74, 460, 0.1, -2)}
  ${closeup('read-only-composer', at(1180, 560, 680) + onColour, pop(S, onBeat(S, part('readonly', 0, 0.5)), { tilt: 1.5 }))}
  </div>`);

// ── Act 4: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 760)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Nobody', 'else.')}</h1>
  </div>
  <div style="${at(900, 190, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.15)), 'A third member cannot read it or post to it')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.5)), 'Nor join its call: refused, as not found')}
  </div>
  <div style="${at(900, 620, 900)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Reactions and replies.<br>Photos in a direct message.</p>
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
wipeInto('grow', 'var(--palette-sun)');
wipeInto('call', 'var(--palette-teal)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
