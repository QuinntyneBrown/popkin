// Video 01 · Journey 1: Start a Popkin. Eleven scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

/** A device that rises into place at `when` and settles at `tilt` degrees. */
const arrive = (S, when, tilt = 0, from = 12) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

// The field of a scene wraps everything in it, so an accent word takes the field's accent colour.
const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;

// ── Act 1: who it is for, on the dark ───────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2))}
  <div style="${at(120, 210, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 1</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Start a', { accent: 'Popkin.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>From your name to a QR code.</p>
  </div>
  ${phone('shots/created-xs-dark.png', { width: 470, theme: 'dark', style: at(1260, 80, 470), attrs: arrive(S, S.beat(2), 5) })}
  </div>
`);

// ── Act 2: signing up, on a phone ───────────────────────────────────────────────────────────────
Film.scene('signup', (S) => `
  <div class="fill field--sand">
  ${phone('shots/sign-up-xs.png', { width: 480, style: at(190, 74, 480), attrs: arrive(S, 0, -3, -10) })}
  <div style="${at(820, 280, 980)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Sign up · L2-003</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Just your', { accent: 'name.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>A phone number or an email.<br>No password.</p>
  </div>
  </div>
`);

Film.scene('code', (S) => `
  <div class="fill field--coral">
  <div style="${at(120, 150, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The code · L2-004</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Six digits,', { accent: 'you’re\u00a0in.' })}</h1>
  </div>
  ${closeup('code-field', at(130, 640, 840), pop(S, S.bar(1), { tilt: -2 }))}
  ${phone('shots/code-xs.png', { width: 480, style: at(1270, 74, 480), attrs: arrive(S, 0, 4) })}
  </div>
`);

// ── Act 3: the same screen on every form factor ─────────────────────────────────────────────────
Film.scene('grow', (S) => `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:64px;text-align:center">${S.words(S.beat(1), 'One screen,', { accent: 'every size.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:236px">
    ${S.grow([
      { src: 'shots/sign-up-xs.png', width: 390, height: 780 },
      { src: 'shots/sign-up-m.png', width: 768, height: 1024 },
      { src: 'shots/sign-up-l.png', width: 1024, height: 768 },
      { src: 'shots/sign-up-xl.png', width: 1440, height: 900 },
    ], (t) => ease.inOut(prog(t, S.bar(1), S.BAR)) + ease.inOut(prog(t, S.bar(2), S.BAR)) + ease.inOut(prog(t, S.bar(3), S.BAR)), { height: 780 })}
  </div>
  </div>
`, { before: 0.3 });

// ── Act 4: making the Popkin ────────────────────────────────────────────────────────────────────
Film.scene('name', (S) => `
  <div class="fill field--teal">
  ${browser('shots/name-xl.png', { width: 1240, url: 'popkin.app/new', style: at(70, 120, 1240), attrs: arrive(S, 0, 0, 0) })}
  <div style="${at(1370, 150, 500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Name it · L2-008</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Name it.', { accent: 'See it.' })}</h1>
  </div>
  ${closeup('preview-blank', at(1160, 590, 700), pop(S, S.bar(1), { tilt: 2, until: S.bar(2) }))}
  ${closeup('preview-crew', at(1160, 590, 700), pop(S, S.bar(2), { tilt: -2, until: S.bar(3) }))}
  ${closeup('preview-lakeside', at(1160, 590, 700), pop(S, S.bar(3), { tilt: 2 }))}
  </div>
`, { before: 0.3 });

Film.scene('length', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 150, 960)}">
    <p class="kicker" ${S.rise(S.beat(1))}>How long · L2-009</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'It lasts as long', { accent: 'as you say.' })}</h1>
  </div>
  ${closeup('timeline-weekend', at(130, 640, 860), pop(S, S.bar(1), { tilt: -2, until: S.bar(3) }))}
  ${closeup('timeline-forever', at(130, 640, 860), pop(S, S.bar(3), { tilt: 1 }))}
  ${tablet('shots/how-long-m.png', { width: 700, style: at(1130, 70, 700), attrs: arrive(S, 0, 2, 8) })}
  </div>
`);

// ── Act 5: it is up ─────────────────────────────────────────────────────────────────────────────
Film.scene('created', (S) => `
  <div class="fill field--night">${S.aurora(() => 0.8, { horizon: 0.7 })}
  ${browser('shots/created-xl.png', { width: 1250, url: 'popkin.app/p/…/created', style: at(70, 170, 1250), attrs: arrive(S, 0.1, 0, 0) })}
  <div style="${at(1400, 110, 420)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Created · L2-010</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Pop!', { accent: 'It’s\u00a0up.' })}</h1>
  </div>
  ${closeup('qr-card', at(1340, 490, 500), pop(S, S.bar(1), { tilt: 3 }))}
  ${S.confetti([S.beat(2), S.bar(3)])}
  </div>
`, { before: 0.3 });

Film.scene('themes', (S) => `
  <div class="fill field--coral">
  <h1 class="headline headline--md" style="${at(120, 70, 1150)};font-size:82px">${S.words(S.beat(1), 'Light or dark,', { accent: 'phone or desk.' })}</h1>
  ${browser('shots/created-xl.png', { width: 1180, url: 'popkin.app/p/…/created', style: at(120, 250, 1180), attrs: arrive(S, 0, 0, 0) })}
  ${phone('shots/created-xs-dark.png', { width: 450, theme: 'dark', style: at(1280, 130, 450), attrs: arrive(S, S.beat(2), 4) })}
  </div>
`);

// ── Act 6: what the tests prove, what is left, the close ────────────────────────────────────────
Film.scene('proof', (S) => `
  <div class="fill field--teal">
  <div style="${at(120, 170, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
    <p class="lede" style="margin-top:48px" ${S.rise(S.bar(1))}>Codes are hashed, last 10 minutes, work once.</p>
    <p class="lede" style="margin-top:20px" ${S.rise(S.bar(2))}>Every component is compared with its design.</p>
  </div>
  <div style="${at(1120, 250, 700)};text-align:center" ${S.rise(S.bar(2), { y: 60 })}>
    <p class="figure accent">244</p>
    <p class="kicker" style="margin-top:28px">comparisons with the designs pass</p>
  </div>
  </div>
`, { before: 0.3 });

Film.scene('left', (S) => `
  <div class="fill field--paper">
  <div style="${at(120, 220, 1500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Left for the owner</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Who sends', { accent: 'the code?' })}</h1>
    <p class="lede" style="margin-top:48px" ${S.rise(S.bar(1))}>The SMS and email providers are not chosen yet.</p>
    <p class="lede" style="margin-top:20px" ${S.rise(S.bar(2))}>Until then, the code goes to the log.</p>
  </div>
  ${closeup('code-field', at(1020, 640, 760), pop(S, S.bar(2), { tilt: -3 }))}
  </div>
`);

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
wipeInto('grow', 'var(--palette-coral-deep)');
wipeInto('name', 'var(--palette-sun)');
wipeInto('created', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
