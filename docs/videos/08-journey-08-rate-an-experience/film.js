// Video 08 · Journey 8: Rate an experience. Twelve scenes on a 120 BPM grid (one bar is two
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

// ── Act 1: Experiences, and sharing one ─────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 8</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'The best part?', { accent: 'Everyone says.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Rate an experience.</p>
  </div>
  ${one(S, 'list-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('list', (S) => {
  const cardAt = onBeat(S, said('list', 1));
  const all = onBeat(S, part('list', 2, 0.2));
  const did = onBeat(S, part('list', 2, 0.5));
  const want = onBeat(S, part('list', 2, 0.8));
  const chips = (src, from, until) => closeup(src, at(960, 880, 700), pop(S, from, { tilt: 1, until }));
  return `
  <div class="fill field--sand">
  ${states(S, ['list-xs', 'list-did-xs', 'list-want-xs'], [did, want], { width: 480, style: at(170, 74, 480), tilt: -3, from: -10 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Experiences · L2-037</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'What we did,', { accent: 'and what’s next.' })}</h1>
  </div>
  ${closeup('card-canoe', at(820, 370, 520), pop(S, cardAt, { tilt: -1.5 }))}
  ${closeup('card-beach', at(1410, 430, 440), pop(S, onBeat(S, part('list', 1, 0.75)), { tilt: 2 }))}
  ${chips('filters-all', all, did)}
  ${chips('filters-did', did, want)}
  ${chips('filters-want', want)}
  </div>`;
});

Film.scene('share', (S) => {
  const dialog = onBeat(S, part('share', 0, 0.2));
  const filled = onBeat(S, said('share', 1));
  const shareIt = onBeat(S, part('share', 1, 0.6));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Share an experience · L2-040</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Share one.', { accent: 'Then, Share it.' })}</h1>
  </div>
  ${closeup('share-one', at(130, 440, 340), pop(S, S.beat(3), { tilt: -2 }))}
  ${closeup('share-kinds', at(330, 650, 840), pop(S, onBeat(S, part('share', 0, 0.55)), { tilt: 1 }))}
  ${states(S, ['list-xs', 'share-empty-xs', 'share-filled-xs', 'share-filled-end-xs'], [dialog, filled, shareIt], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

Film.scene('shared', (S) => `
  <div class="fill field--sun">
  ${one(S, 'shared-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Shared · L2-040</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'First', { accent: 'in the list.' })}</h1>
  </div>
  ${closeup('card-bonfire', at(820, 400, 460) + onSun, pop(S, onBeat(S, part('shared', 0, 0.3)), { tilt: -1.5 }))}
  ${closeup('toast-shared', at(1320, 620, 540) + onSun, pop(S, onBeat(S, part('shared', 0, 0.7)), { tilt: 1.5 }))}
  </div>
`);

// ── Act 2: an experience, its score, a rating and a comment ─────────────────────────────────────
Film.scene('detail', (S) => `
  <div class="fill field--teal">
  <div style="${at(120, 90, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>An experience · L2-038</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The group’s', { accent: 'score.' })}</h1>
  </div>
  ${closeup('detail-intro', at(130, 400, 700) + onColour, pop(S, S.beat(4), { tilt: -1.5 }))}
  ${closeup('score', at(440, 730, 720) + onColour, pop(S, onBeat(S, said('detail', 1)), { tilt: 1 }))}
  ${one(S, 'detail-xs', 1350, 90, 460, 0.1, 3)}
  </div>
`, { before: 0.3 });

Film.scene('rate', (S) => {
  const thanks = onBeat(S, said('rate', 1));
  const score = onBeat(S, part('rate', 1, 0.4));
  return `
  <div class="fill field--sand">
  ${states(S, ['detail-score-xs', 'rated-xs'], [thanks], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 80, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Rate · L2-039</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Five stars.', { accent: 'One tap.' })}</h1>
  </div>
  ${closeup('rating-ask', at(820, 400, 660), pop(S, S.beat(3), { tilt: -1.5, until: thanks }))}
  ${closeup('rating-thanks', at(820, 400, 660), pop(S, thanks, { tilt: -1.5 }))}
  ${closeup('score-rated', at(1180, 780, 600), pop(S, score, { tilt: 1.5 }))}
  </div>`;
});

Film.scene('comment', (S) => {
  const first = onBeat(S, said('comment', 1) + 0.6);
  return `
  <div class="fill field--coral">
  <div style="${at(120, 90, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Comment · L2-041</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Add a', { accent: 'comment.' })}</h1>
  </div>
  ${closeup('comment-dialog', at(130, 400, 560) + onColour, pop(S, S.beat(3), { tilt: -1.5, until: first }))}
  ${closeup('comment-first', at(130, 520, 1060) + onColour, pop(S, first, { tilt: -1 }))}
  <p class="kicker" style="${at(140, 860, 1060)}" ${S.rise(first + S.BEAT)}>First under “What people said”</p>
  ${states(S, ['comment-dialog-xs', 'commented-xs'], [first], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

// ── Act 3: what its sharer can do, and the home ─────────────────────────────────────────────────
Film.scene('actions', (S) => {
  const menu = onBeat(S, part('actions', 0, 0.72));
  const edit = onBeat(S, said('actions', 1));
  const ask = onBeat(S, said('actions', 2));
  const gone = onBeat(S, lineOf('actions', 2).end - Film.at('actions'));
  return `
  <div class="fill field--paper">
  ${states(S, ['detail-xs', 'actions-xs', 'edit-xs', 'delete-xs', 'deleted-xs'], [menu, edit, ask, gone], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 80, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Its sharer’s actions · L2-040</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Yours to', { accent: 'edit or delete.' })}</h1>
  </div>
  ${cut('detail-picture', { x: 640, y: 4, w: 136, h: 136, k: 1.3, left: 830, top: 440 }, pop(S, S.beat(3), { tilt: -3, until: menu }))}
  <p class="kicker" style="${at(1050, 500, 700)}" ${during(S, S.beat(4), menu)}>“Experience actions”,<br>over the picture</p>
  ${closeup('actions-dialog', at(820, 420, 720), pop(S, menu, { tilt: -1.5, until: edit }))}
  <div style="${at(820, 460, 980)}" ${during(S, edit, ask)}>
    <p class="kicker">“Edit”</p>
    <p class="lede" style="margin-top:14px;font-weight:700">“Edit experience” opens<br>with what it has.</p>
  </div>
  ${closeup('delete-dialog', at(820, 410, 720), pop(S, ask, { tilt: 1, until: gone }))}
  ${closeup('toast-deleted', at(820, 480, 860), pop(S, gone, { tilt: -1.5 }))}
  <p class="kicker" style="${at(830, 760, 860)}" ${S.rise(gone + S.BEAT)}>Back on Experiences, without it</p>
  </div>`;
}, { before: 0.3 });

Film.scene('home', (S) => `
  <div class="fill field--sun">
  <div style="${at(120, 110, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Popkin home · L2-019</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The highest rated,', { accent: 'on the home.' })}</h1>
  </div>
  ${closeup('home-experiences-xs', at(130, 560, 900) + onSun, pop(S, onBeat(S, part('home', 0, 0.35)), { tilt: -1.5 }))}
  ${tablet('shots/home-m.png', { width: 620, style: at(1190, 110, 620), attrs: arrive(S, 0.1, 2, 10) })}
  </div>
`);

// ── Act 4: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, said('grow', 1)) - S.BEAT;
  const three = onBeat(S, part('grow', 1, 0.25));
  const four = onBeat(S, part('grow', 1, 0.68));
  const beside = onBeat(S, said('grow', 2)) - S.BEAT;
  const p = (t) => [two, three, four].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One across,', { accent: 'then four.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px" ${S.ref((el, t) => { el.style.visibility = t >= beside ? 'hidden' : 'visible'; })}>
    ${S.grow([
      { src: 'shots/list-xs.png', width: 390, height: 780 },
      { src: 'shots/list-m.png', width: 768, height: 1024 },
      { src: 'shots/list-l.png', width: 1024, height: 768 },
      { src: 'shots/list-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${browser('shots/detail-l.png', { width: 950, ratio: 1024 / 768, style: at(150, 196, 950), attrs: arrive(S, beside, -1, 6) })}
  ${cut('detail-l', { x: 1350, y: 30, w: 690, h: 660, k: 0.95, left: 1160, top: 290, ring: onColour }, pop(S, beside + S.BEAT * 2, { tilt: 2 }))}
  ${label(S.beat(2), two + 0.6, 'A phone: one across')}
  ${label(two + 0.6, three + 0.6, 'A tablet, 768 px: two across')}
  ${label(three + 0.6, four + 0.6, 'From 1024 px: three across')}
  ${label(four + 0.6, beside, 'From 1280 px: four across')}
  ${label(beside + 0.3, Infinity, 'From 1024 px: the picture beside the ratings')}
  </div>`;
}, { before: 0.3 });

// ── Act 5: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'One rating', { accent: 'each.' })}</h1>
  </div>
  <div style="${at(120, 620, 700)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Saying you are keen.</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.25)), 'Each member gives one rating, from one to five stars')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.55)), 'A different star changes it; the count stays the same')}
    ${fact(S, 3, onBeat(S, part('proof', 0, 1)), 'The Host can delete any experience')}
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
wipeInto('detail', 'var(--palette-coral)');
wipeInto('actions', 'var(--palette-teal)');
wipeInto('grow', 'var(--palette-sun)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
