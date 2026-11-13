// Video 03 · Journey 3: Chat with everyone. Thirteen scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
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

// ── Act 1: the thread ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1050)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 3</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Chat with', { accent: 'everyone.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>The heart of a Popkin.</p>
  </div>
  ${phone('shots/thread-xs-dark.png', { width: 470, theme: 'dark', style: at(1260, 80, 470), attrs: 'data-notch="off" ' + arrive(S, S.beat(2), 5) })}
  </div>
`);

Film.scene('thread', (S) => `
  <div class="fill field--sand">
  ${phone('shots/thread-xs.png', { width: 480, style: at(190, 74, 480), attrs: 'data-notch="off" ' + arrive(S, 0, -3, -10) })}
  <div style="${at(820, 120, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The Everyone thread · L2-021</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One thread for', { accent: 'everyone.' })}</h1>
  </div>
  ${closeup('thread-header', at(840, 480, 860), pop(S, S.beat(4), { tilt: -1.5 }))}
  ${closeup('thread-note', at(1010, 720, 760), pop(S, onBeat(S, said('thread', 1) + 2), { tilt: 1.5 }))}
  <p class="lede" style="${at(840, 900, 900)}" ${S.rise(onBeat(S, said('thread', 1)))}>Oldest first, a divider for each day.</p>
  </div>
`);

Film.scene('bubbles', (S) => {
  const label = (x, y, when, text) => `<p class="kicker" style="${at(x, y, 820)};text-align:center" ${S.rise(when)}>${text}</p>`;
  const yours = onBeat(S, said('bubbles', 1));
  return `
  <div class="fill field--coral">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:80px;text-align:center">${S.words(S.beat(1), 'Theirs left.', { accent: 'Yours right.' })}</h1>
  ${closeup('thread-theirs', at(110, 380, 820) + onCoral, pop(S, S.beat(2), { tilt: -2 }))}
  ${label(110, 660, S.beat(3), 'Avatar and first name')}
  ${closeup('thread-mine', at(990, 560, 820) + onCoral, pop(S, yours, { tilt: 2 }))}
  ${label(990, 830, yours + S.BEAT, 'The Popkin’s colour, with its time')}
  </div>`;
});

// ── Act 2: sending ──────────────────────────────────────────────────────────────────────────────
Film.scene('send', (S) => {
  const sent = onBeat(S, said('send', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 150, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Send a message · L2-021</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Press', { accent: 'Enter.' })}</h1>
  </div>
  ${closeup('send-typed', at(130, 560, 800), pop(S, S.beat(2), { tilt: -2, until: sent }))}
  ${closeup('send-sent', at(130, 520, 800), pop(S, sent, { tilt: -2 }))}
  ${closeup('send-empty', at(190, 760, 800), pop(S, sent + S.BEAT, { tilt: 1 }))}
  ${states(S, ['send-typed-xs', 'send-sent-xs'], [sent], { width: 470, style: at(1260, 80, 470), when: 0.1, tilt: 4 })}
  </div>`;
}, { before: 0.3 });

Film.scene('lines', (S) => {
  const count = onBeat(S, said('lines', 1));
  return `
  <div class="fill field--teal">
  <div style="${at(120, 110, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Send a message · L2-021</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(1), 'Shift+Enter,', { accent: 'a new line.' })}</h1>
  </div>
  <div style="${at(120, 590, 900)}" ${S.rise(count, { y: 60 })}>
    <p class="figure accent" style="font-size:260px">2,000</p>
    <p class="kicker" style="margin-top:28px">characters in a message, at most</p>
  </div>
  ${closeup('send-two-lines', at(1030, 120, 770), pop(S, S.beat(2), { tilt: 2 }))}
  ${closeup('send-full', at(1000, 440, 770), pop(S, count + S.BEAT, { tilt: -1.5 }))}
  </div>`;
});

// ── Act 3: live ─────────────────────────────────────────────────────────────────────────────────
Film.scene('live', (S) => {
  const arrives = S.beat(5);
  const announced = onBeat(S, said('live', 1));
  return `
  <div class="fill field--night">
  ${states(S, ['thread-xs', 'live-xs'], [arrives], { width: 480, style: at(190, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(820, 130, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Messages arrive as they are sent · L2-027</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Live,', { accent: 'without reloading.' })}</h1>
  </div>
  <p class="lede" style="${at(820, 410, 1000)}" ${S.rise(S.beat(3))}>Within a second of being sent.</p>
  ${closeup('live-arrived', at(840, 540, 820) + onNight, pop(S, arrives, { tilt: -2 }))}
  <div style="${at(900, 810, 860)};${card};padding:30px 44px" ${S.rise(announced, { y: 50 })}>
    <p class="kicker" style="color:var(--palette-teal-deep)">Announced politely</p>
    <p style="margin:14px 0 0;font:800 52px/1.15 var(--font-family-display)">“Walt: Kettle is on”</p>
  </div>
  </div>`;
}, { before: 0.3 });

Film.scene('newer', (S) => {
  const latest = onBeat(S, said('newer', 1) + 0.6);
  return `
  <div class="fill field--sand">
  <div style="${at(120, 150, 1050)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Reading older messages · L2-027</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'The view', { accent: 'stays put.' })}</h1>
  </div>
  ${closeup('new-messages', at(220, 560, 600), pop(S, S.beat(4), { tilt: -3, until: latest }))}
  ${closeup('new-messages-latest', at(130, 600, 900), pop(S, latest, { tilt: -2 }))}
  ${states(S, ['new-messages-xs', 'new-messages-latest-xs'], [latest], { width: 470, style: at(1260, 80, 470), tilt: 4 })}
  </div>`;
});

// ── Act 4: a message is never lost silently ─────────────────────────────────────────────────────
Film.scene('failed', (S) => {
  const fails = onBeat(S, said('failed', 1));
  const again = onBeat(S, said('failed', 2) + 0.4);
  return `
  <div class="fill field--coral">
  <div style="${at(120, 100, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Messages that cannot be sent · L2-028</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Never lost', { accent: 'silently.' })}</h1>
  </div>
  ${closeup('failed-message', at(130, 620, 1040) + onCoral, pop(S, fails, { tilt: -1.5, until: again }))}
  ${closeup('retried-message', at(130, 650, 1040) + onCoral, pop(S, again, { tilt: -1.5 }))}
  ${states(S, ['failed-xs', 'retried-xs'], [again], { width: 460, style: at(1330, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
}, { before: 0.3 });

Film.scene('offline', (S) => {
  const waits = onBeat(S, said('offline', 1));
  const back = onBeat(S, said('offline', 2) + 2.4);
  return `
  <div class="fill field--paper">
  ${states(S, ['offline-xs', 'offline-waiting-xs', 'online-xs', 'online-sent-xs'], [waits, back, back + S.BAR], { width: 480, style: at(190, 74, 480), tilt: -3, from: -10 })}
  <div style="${at(820, 120, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Offline · L2-028</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Offline?', { accent: 'It waits.' })}</h1>
  </div>
  ${closeup('offline-banner', at(840, 400, 900), pop(S, S.beat(2), { tilt: -1.5, until: back }))}
  ${closeup('offline-waiting-1', at(1010, 600, 760), pop(S, waits, { tilt: 1.5, until: back }))}
  ${closeup('offline-waiting-2', at(900, 800, 760), pop(S, waits + S.BEAT, { tilt: -1, until: back }))}
  ${closeup('online-banner', at(840, 520, 940), pop(S, back, { tilt: -1.5 }))}
  </div>`;
});

// ── Act 5: the same thread on every form factor ─────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const steps = [S.beat(9), S.beat(15), S.beat(27)];
  const p = (t) => steps.reduce((sum, when) => sum + ease.inOut(prog(t, when, 1.2)), 0);
  const label = (i, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    const from = i === 0 ? S.beat(2) : steps[i - 1] + 0.6;
    el.style.opacity = i < steps.length && t >= steps[i] + 0.6 ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One thread,', { accent: 'every size.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/thread-xs.png', width: 390, height: 780 },
      { src: 'shots/thread-m.png', width: 768, height: 1024 },
      { src: 'shots/thread-l.png', width: 1024, height: 768 },
      { src: 'shots/thread-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${label(0, 'A phone: the thread alone, no tabs')}
  ${label(1, 'From 768 px: the rail')}
  ${label(2, 'From 1024 px: the sidebar and the list of conversations')}
  ${label(3, 'From 1280 px: who is here now')}
  </div>`;
}, { before: 0.3 });

Film.scene('panes', (S) => {
  const dark = onBeat(S, said('panes', 1));
  const window = (src, theme, show) => browser(`shots/${src}.png`, {
    width: 1180, theme, url: 'popkin.app/p/…/chat/everyone', style: at(110, 250, 1180), attrs: arrive(S, 0, 0, 0, show),
  });
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="${at(120, 70, 1250)};font-size:84px">${S.words(S.beat(1), 'The list, the thread,', { accent: 'who’s here.' })}</h1>
  ${window('thread-xl', 'light', (t) => t < dark)}
  ${window('thread-xl-dark', 'dark', (t) => t >= dark)}
  ${topOf('thread-list-pane', at(1420, 70, 400), 166, pop(S, S.beat(2), { tilt: 1.5 }))}
  ${topOf('thread-detail-pane', at(1420, 296, 400), 692, pop(S, S.beat(4), { tilt: -1 }))}
  </div>`;
});

// ── Act 6: what the tests prove, and the close ──────────────────────────────────────────────────
Film.scene('proof', (S) => {
  const second = onBeat(S, said('proof', 1));
  const fact = (n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans)" ${S.rise(when, { y: 50 })}>
    <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span>${text}</div>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
  </div>
  <div style="${at(120, 520, 800)}" ${S.rise(S.bar(1), { y: 60 })}>
    <p class="figure accent" style="font-size:280px">38</p>
    <p class="kicker" style="margin-top:28px">behaviour specs of this screen</p>
  </div>
  <div style="${at(900, 330, 900)}">
    ${fact(1, second, 'A message tried again is stored once')}
    ${fact(2, second + S.BAR, 'Only a member reads the thread')}
    ${fact(3, second + S.BAR * 1.5, 'A dropped connection catches up')}
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
wipeInto('send', 'var(--palette-teal)');
wipeInto('live', 'var(--palette-coral)');
wipeInto('failed', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral-deep)');
wipeInto('proof', 'var(--palette-teal)');

Film.start();
