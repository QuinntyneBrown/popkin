// Video 04 · Journey 4: Popkin home. Eleven scenes on a 120 BPM grid (one bar is two seconds).
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
const states = (S, shots, cuts, { width, style, when = 0, tilt = 0, from = 12 }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    style,
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

// ── Act 1: the home, and its header ─────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1050)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 4</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'A Popkin,', { accent: 'at a glance.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>The Popkin home.</p>
  </div>
  ${phone('shots/home-xs-dark.png', { width: 470, theme: 'dark', style: at(1260, 80, 470), attrs: 'data-notch="off" ' + arrive(S, S.beat(2), 5) })}
  </div>
`);

Film.scene('header', (S) => `
  <div class="fill field--sand">
  ${phone('shots/home-xs.png', { width: 480, style: at(190, 74, 480), attrs: 'data-notch="off" ' + arrive(S, 0, -3, -10) })}
  <div style="${at(820, 100, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The header · L2-019</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Who’s in,', { accent: 'how long.' })}</h1>
  </div>
  ${closeup('header-identity', at(840, 440, 860), pop(S, S.beat(3), { tilt: -1.5 }))}
  ${closeup('header-time', at(1010, 680, 760), pop(S, onBeat(S, said('header', 1)), { tilt: 1.5 }))}
  ${closeup('header-actions', at(860, 860, 860), pop(S, onBeat(S, said('header', 2)), { tilt: -1 }))}
  </div>
`);

// ── Act 2: what the home holds ──────────────────────────────────────────────────────────────────
Film.scene('chat', (S) => {
  const arrives = onBeat(S, said('chat', 1) + 0.6);
  return `
  <div class="fill field--coral">
  <div style="${at(120, 90, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The Chat card · L2-019, L2-027</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The latest,', { accent: 'and what’s new.' })}</h1>
  </div>
  ${closeup('chat', at(120, 460, 840) + onCoral, pop(S, S.beat(3), { tilt: -1.5, until: arrives }))}
  ${closeup('chat-live', at(120, 460, 840) + onCoral, pop(S, arrives, { tilt: -1.5 }))}
  ${closeup('tab-chat', at(1030, 560, 230) + onCoral, pop(S, S.beat(6), { tilt: 3, until: arrives }))}
  ${closeup('tab-chat-live', at(1030, 560, 230) + onCoral, pop(S, arrives, { tilt: 3 }))}
  <p class="kicker" style="${at(990, 830, 310)};text-align:center" ${S.rise(S.beat(6))}>The Chat tab</p>
  ${states(S, ['home-xs', 'live-xs'], [arrives], { width: 460, style: at(1340, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
}, { before: 0.3 });

Film.scene('sections', (S) => {
  const label = (x, y, when, text) => `<p class="kicker" style="${at(x, y, 580)};text-align:center" ${S.rise(when)}>${text}</p>`;
  const second = onBeat(S, said('sections', 1));
  const third = onBeat(S, said('sections', 2));
  return `
  <div class="fill field--paper">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:110px;text-align:center;font-size:96px">${S.words(S.beat(1), 'Photos. Experiences.', { accent: 'Members.' })}</h1>
  ${closeup('photos', at(70, 480, 580), pop(S, S.beat(2), { tilt: -2 }))}
  ${label(70, 840, S.beat(3), 'The count, thumbnails, See all')}
  ${closeup('experiences', at(670, 620, 580), pop(S, second, { tilt: 1.5 }))}
  ${label(670, 960, second + S.BEAT, 'The highest rated')}
  ${closeup('members', at(1270, 400, 580), pop(S, third, { tilt: -1 }))}
  ${label(1270, 920, third + S.BEAT, 'The Host first')}
  </div>`;
});

// ── Act 3: a new Popkin, and a section that fails ───────────────────────────────────────────────
Film.scene('empty', (S) => {
  const cuts = [1, 2, 3].map((n) => onBeat(S, said('empty', n)));
  return `
  <div class="fill field--teal">
  ${states(S, ['empty-xs', 'empty-photos-xs', 'empty-experiences-xs'], [cuts[1], cuts[2]], { width: 480, style: at(190, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(820, 100, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A new Popkin · L2-019</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Never a', { accent: 'blank page.' })}</h1>
  </div>
  ${closeup('empty-chat', at(900, 390, 720) + onCoral, pop(S, S.beat(3), { tilt: -2, until: cuts[1] }))}
  ${closeup('empty-photos', at(900, 420, 720) + onCoral, pop(S, cuts[1], { tilt: 1.5, until: cuts[2] }))}
  ${closeup('empty-experiences', at(900, 400, 720) + onCoral, pop(S, cuts[2], { tilt: -1.5 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('partial', (S) => {
  const again = onBeat(S, said('partial', 1));
  return `
  <div class="fill field--night">
  <div style="${at(120, 100, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>A section that fails · L2-019</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One fails.', { accent: 'The rest is fine.' })}</h1>
  </div>
  ${closeup('failed-photos', at(130, 580, 960) + onNight, pop(S, S.beat(3), { tilt: -1.5, until: again }))}
  ${closeup('recovered-photos', at(130, 520, 960) + onNight, pop(S, again, { tilt: -1.5 }))}
  ${states(S, ['failed-xs', 'recovered-xs'], [again], { width: 460, style: at(1340, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

// ── Act 4: bring someone in ─────────────────────────────────────────────────────────────────────
Film.scene('invite', (S) => {
  const copied = onBeat(S, said('invite', 1) + 1.2);
  const wide = onBeat(S, said('invite', 2));
  return `
  <div class="fill field--sand">
  ${states(S, ['invite-xs', 'invite-copied-xs'], [copied], { width: 480, style: at(190, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(820, 90, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Invite · L2-011</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Bring someone', { accent: 'in.' })}</h1>
  </div>
  ${closeup('invite-copy', at(860, 330, 640), pop(S, S.beat(4), { tilt: -1.5, until: copied }))}
  ${closeup('invite-copied', at(860, 330, 640), pop(S, copied, { tilt: -1.5 }))}
  ${closeup('invite-qr', at(1000, 500, 480), pop(S, S.beat(3), { tilt: 2, until: wide }))}
  ${browser('shots/invite-xl.png', { width: 800, url: 'popkin.app/p/…', style: at(900, 500, 800), attrs: arrive(S, wide, 1.5, 6) })}
  </div>`;
}, { before: 0.3 });

// ── Act 5: the same home on every form factor ───────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const steps = [S.beat(9), S.beat(15), S.beat(31)];
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 1.2)), 0);
  const label = (i, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    const from = i === 0 ? S.beat(2) : steps[i - 1] + 0.6;
    el.style.opacity = i < steps.length && t >= steps[i] + 0.6 ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One home,', { accent: 'every size.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/home-xs.png', width: 390, height: 780 },
      { src: 'shots/home-m.png', width: 768, height: 1024 },
      { src: 'shots/home-l.png', width: 1024, height: 768 },
      { src: 'shots/home-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(0, 'A phone: one column')}
  ${label(1, 'From 768 px: the tabs are a rail')}
  ${label(2, 'From 1024 px: the sidebar, and two columns')}
  ${label(3, '1440 px: the same home, with more room')}
  </div>`;
}, { before: 0.3 });

Film.scene('wide', (S) => {
  const dark = onBeat(S, said('wide', 1));
  const window = (src, theme, show) => browser(`shots/${src}.png`, {
    width: 1180, theme, url: 'popkin.app/p/…', style: at(110, 250, 1180), attrs: arrive(S, 0, 0, 0, show),
  });
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="${at(120, 70, 1250)};font-size:84px">${S.words(S.beat(1), 'More room,', { accent: 'more to see.' })}</h1>
  ${window('home-xl', 'light', (t) => t < dark)}
  ${window('home-xl-dark', 'dark', (t) => t >= dark)}
  ${closeup('experiences-wide', at(1390, 80, 440) + onCoral, pop(S, S.beat(4), { tilt: 1.5 }))}
  ${closeup('members-wide', at(1390, 540, 440) + onCoral, pop(S, S.beat(6), { tilt: -1 }))}
  </div>`;
});

// ── Act 6: what the tests prove, what comes later, and the close ────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  const fact = (n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans)" ${S.rise(when, { y: 50 })}>
    <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span>${text}</div>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
  </div>
  <div style="${at(120, 520, 800)}" ${S.rise(S.bar(1), { y: 60 })}>
    <p class="figure accent" style="font-size:280px">39</p>
    <p class="kicker" style="margin-top:28px">behaviour specs</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(1, S.bar(1), 'Only a member reads the home')}
    ${fact(2, S.bar(1) + S.BEAT * 2, 'The time left moves on with the minutes')}
    ${fact(3, S.bar(2), 'Someone who joins is counted and listed')}
  </div>
  <div style="${at(900, 800, 900)}" ${S.rise(later, { y: 50 })}>
    <p class="kicker">Later journeys</p>
    <p class="lede" style="margin-top:14px;font-weight:700">The album, experiences, the group call.</p>
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
wipeInto('chat', 'var(--palette-teal)');
wipeInto('empty', 'var(--palette-coral)');
wipeInto('invite', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral-deep)');
wipeInto('proof', 'var(--palette-teal)');

Film.start();
