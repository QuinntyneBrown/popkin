// Video 19 · Meet Popkin: the pitch. Eleven scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app, saved by the shots.ts of an earlier film
// (README.md lists which); every position is a pure function of the scene's time
// (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;
/** A screenshot from the film that took it: shot(F.home, 'home-xs'). */
const shot = (film, name) => `../${film}/shots/${name}.png`;
const F = {
  start: '01-journey-01-start-a-popkin',
  join: '02-journey-02-join-by-invite',
  home: '04-journey-04-popkin-home',
  photos: '05-journey-05-share-photos',
  call: '07-journey-07-group-call',
  rate: '08-journey-08-rate-an-experience',
  wrap: '09-journey-09-wrap-up',
  land: '10-journey-10-discover-popkin',
  dm: '11-journey-11-direct-message',
  keen: '15-journey-20-say-keen',
  react: '16-journey-12-react-and-reply',
};

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which the fraction `f` of line `n` of scene `id` has been spoken. */
const part = (id, n, f) => lineOf(id, n).start - Film.at(id) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it: a cut belongs on the grid. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;
const beatOf = (S, id, n, f) => onBeat(S, part(id, n, f));

/** A device that rises into place at `when` and settles at `tilt` degrees. */
const arrive = (S, when, tilt = 0, from = 12) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });
/** One phone, without its notch. */
const one = (S, src, x, y, width, when, tilt, theme = 'light') =>
  phone(src, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });
/** A close-up that pops in at `when`. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });
const closeup = (src, style, attrs) => `<img class="closeup" src="${src}" alt="" style="${style}" ${attrs}>`;
/** On a coral or teal field the accent ring would vanish: the ring is white there; on sun, black. */
const onColour = ';outline-color:var(--palette-white)';
const onSun = ';outline-color:var(--palette-black)';
/** A headline whose accent words start a line of their own. */
const twoLines = (S, when, text, accent) => `${S.words(when, text)}<br>${S.words(when + 0.1, '', { accent })}`;

// ── Act 1: the moment, and the group chat ───────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.7)}
  <div style="${at(120, 250, 1100)}">
    <h1 class="headline">${twoLines(S, S.beat(4), 'We should all', 'get together.')}</h1>
    <p class="lede" style="margin-top:44px" ${S.rise(S.bar(2))}>You know the moment.</p>
  </div>
  ${one(S, shot(F.land, 'landing-xs-dark'), 1300, 90, 460, S.beat(3), 5, 'dark')}
  </div>
`);

Film.scene('problem', (S) => `
  <div class="fill field--paper">
  <div style="${at(110, 60, 1700)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Then the group chat begins</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(1), 'Not another', { accent: 'group chat.' })}</h1>
  </div>
  ${closeup(shot(F.land, 'compare-table'), at(260, 300, 1400), pop(S, beatOf(S, 'problem', 0, 0.2), { tilt: -1 }))}
  </div>
`);

// ── Act 2: meet Popkin ──────────────────────────────────────────────────────────────────────────
Film.scene('meet', (S) => `
  <div class="fill field--coral">
  <div style="${at(120, 270, 900)}">
    <h1 class="headline">${S.words(S.beat(1), 'Meet', { accent: 'Popkin.' })}</h1>
    <p class="lede" style="margin-top:40px;font-weight:700" ${S.rise(beatOf(S, 'meet', 0, 0.3))}>A private space for your people.<br>Popped up in seconds.</p>
  </div>
  ${one(S, shot(F.start, 'created-xs'), 1000, 120, 420, beatOf(S, 'meet', 0, 0.2), -4)}
  ${one(S, shot(F.home, 'home-xs'), 1420, 70, 420, beatOf(S, 'meet', 0, 0.55), 3)}
  </div>
`, { before: 0.3 });

Film.scene('invite', (S) => `
  <div class="fill field--sand">
  <div style="position:absolute;left:0;right:0;top:60px;text-align:center">
    <h1 class="headline headline--md">${S.words(S.beat(1), 'Scan. Join.', { accent: 'You’re in.' })}</h1>
  </div>
  ${closeup(shot(F.home, 'invite-qr'), at(130, 300, 540), pop(S, S.beat(2), { tilt: -3 }))}
  <p class="kicker" style="${at(130, 930, 560)};text-align:center" ${S.rise(S.beat(3))}>Hold up the code</p>
  ${one(S, shot(F.join, 'invite-xs'), 800, 220, 380, beatOf(S, 'invite', 0, 0.3), 2)}
  ${one(S, shot(F.join, 'welcome-xs'), 1320, 250, 380, beatOf(S, 'invite', 0, 0.6), -2)}
  </div>
`);

// ── Act 3: together ─────────────────────────────────────────────────────────────────────────────
Film.scene('chat', (S) => `
  <div class="fill field--teal">
  ${one(S, shot(F.react, 'hearted-xs'), 130, 80, 440, 0.1, -3)}
  <div style="${at(690, 80, 1100)}">
    <h1 class="headline">${S.words(S.beat(1), 'Talk it', { accent: 'out.' })}</h1>
  </div>
  ${closeup(shot(F.react, 'mara-quote'), at(700, 400, 620) + onColour, pop(S, beatOf(S, 'chat', 0, 0.3), { tilt: -1.5 }))}
  <p class="kicker" style="${at(700, 720, 620)}" ${S.rise(beatOf(S, 'chat', 0, 0.6))}>React · Reply · Direct message</p>
  ${one(S, shot(F.dm, 'dm-xs'), 1400, 230, 400, beatOf(S, 'chat', 0, 0.65), 3)}
  </div>
`, { before: 0.3 });

Film.scene('photos', (S) => `
  <div class="fill field--paper">
  <div style="${at(100, 120, 480)}">
    <h1 class="headline headline--md">${twoLines(S, S.beat(1), 'One shared', 'album.')}</h1>
    <p class="lede" style="margin-top:36px" ${S.rise(beatOf(S, 'photos', 0, 0.6))}>By the day.<br>From everyone.</p>
  </div>
  ${browser(shot(F.photos, 'album-xl'), { width: 1240, style: at(600, 160, 1240), attrs: arrive(S, 0.1, 1, 5) })}
  </div>
`);

Film.scene('call', (S) => `
  <div class="fill field--night">
  <div style="${at(100, 50, 1700)}">
    <h1 class="headline headline--md">${S.words(S.beat(1), 'One tap,', { accent: 'whole group.' })}</h1>
  </div>
  ${browser(shot(F.call, 'call-six-xl'), { width: 1180, theme: 'dark', style: at(90, 230, 1180), attrs: arrive(S, 0.1, -1, 4) })}
  ${one(S, shot(F.call, 'call-six-xs'), 1380, 170, 420, beatOf(S, 'call', 0, 0.5), 4, 'dark')}
  </div>
`);

Film.scene('rate', (S) => `
  <div class="fill field--sun">
  ${one(S, shot(F.keen, 'want-xs'), 110, 100, 420, 0.1, -4)}
  <div style="position:absolute;left:600px;width:720px;top:100px;text-align:center">
    <h1 class="headline headline--md">${twoLines(S, S.beat(1), 'Rate the', 'moments.')}</h1>
  </div>
  ${closeup(shot(F.keen, 'panel-keen'), at(680, 440, 560) + onSun, pop(S, beatOf(S, 'rate', 0, 0.2), { tilt: -2 }))}
  ${closeup(shot(F.rate, 'score'), at(680, 770, 560) + onSun, pop(S, beatOf(S, 'rate', 0, 0.7), { tilt: 1.5 }))}
  ${one(S, shot(F.rate, 'detail-xs'), 1390, 100, 420, beatOf(S, 'rate', 0, 0.5), 4)}
  </div>
`);

// ── Act 4: the end, done well ───────────────────────────────────────────────────────────────────
Film.scene('wrap', (S) => {
  const send = beatOf(S, 'wrap', 0, 0.45);
  return `
  <div class="fill field--night">${S.aurora(() => 0.45)}
  ${one(S, shot(F.wrap, 'recap-xs'), 150, 70, 460, 0.1, -3)}
  <div style="${at(760, 90, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>When it’s over</p>
    <h1 class="headline" style="margin-top:20px">${twoLines(S, S.beat(2), 'A proper', 'send-off.')}</h1>
  </div>
  ${closeup(shot(F.wrap, 'recap-stats'), at(790, 560, 600), pop(S, send, { tilt: -1.5 }))}
  ${closeup(shot(F.wrap, 'recap-moment'), at(1090, 780, 680), pop(S, beatOf(S, 'wrap', 0, 0.75), { tilt: 1.5 }))}
  ${S.confetti([send], { count: 160 })}
  </div>`;
}, { before: 0.3 });

Film.scene('free', (S) => {
  const grows = beatOf(S, 'free', 1, 0);
  const p = (t) => [0, 1, 2].reduce((sum, k) => sum + ease.inOut(prog(t, grows + k * S.BEAT * 2, 0.8)), 0);
  return `
  <div class="fill field--teal">
  <div style="position:absolute;left:0;right:0;top:40px;text-align:center">
    <h1 class="headline headline--md">${S.words(S.beat(1), 'Like, actually', { accent: 'free.' })}</h1>
  </div>
  <div style="position:absolute;left:0;right:0;top:200px">
    ${S.grow([
      { src: shot(F.land, 'landing-xs'), width: 390, height: 780 },
      { src: shot(F.land, 'landing-m'), width: 768, height: 1024 },
      { src: shot(F.land, 'landing-l'), width: 1024, height: 768 },
      { src: shot(F.land, 'landing-xl'), width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  <p class="lede" style="position:absolute;left:0;right:0;top:990px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = enter(t, beatOf(S, 'free', 0, 0.55), 0.3);
    el.textContent = t < grows ? 'No ads. No premium tier.' : 'In the browser, on a phone or a desktop.';
  })}></p>
  </div>`;
});

Film.scene('close', (S) => `
  <div class="fill field--night">${S.aurora((t) => 1 - exit(t, S.length - 2.5, 2.5) * 0.6)}
  <div style="position:absolute;left:0;right:0;top:290px;text-align:center">
    <p class="wordmark" ${S.rise(S.beat(1), { y: 40 })}>Popkin</p>
    <p class="headline headline--md" style="margin-top:48px">${S.words(beatOf(S, 'close', 0, 0.25), 'Your people,', { accent: 'popped up in seconds.' })}</p>
    <p class="lede" style="margin-top:56px" ${S.rise(beatOf(S, 'close', 0, 0.85))}>Start a Popkin. Free. Takes about a minute.</p>
  </div>
  </div>
`, { before: 0.3 });

// A change of act is a wipe in a Popkin colour; inside an act the cuts are hard.
const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('meet', 'var(--palette-sun)');
wipeInto('chat', 'var(--palette-coral)');
wipeInto('wrap', 'var(--palette-sun)');
wipeInto('close', 'var(--palette-coral)');

Film.start();
