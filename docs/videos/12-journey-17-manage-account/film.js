// Video 12 · Journey 17: Manage account. Nine scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;
const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
const said = (id, n) => lineOf(id, n).start - Film.at(id);
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;

const arrive = (S, when, tilt = 0, from = 12) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.55);
    el.style.opacity = clamp(p * 4);
    el.style.transform = `translateY(${(1 - p) * 700}px) rotate(${lerp(from, tilt, p)}deg)`;
  });
const one = (S, src, x, y, width, when, tilt, theme = 'light') =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });
const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
const onColour = ';outline-color:var(--palette-white)';
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: the account ───────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 17</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Your', { accent: 'account.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Manage account.</p>
  </div>
  ${one(S, 'account-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('account', (S) => {
  const shown = onBeat(S, said('account', 1));
  return `
  <div class="fill field--sand">
  ${closeup('avatar', at(860, 330, 260), pop(S, S.beat(2), { tilt: -3, until: shown }))}
  <p class="kicker" style="${at(1160, 380, 500)}" ${S.ref((el, t) => { el.style.opacity = t >= shown ? 0 : enter(t, S.beat(3), 0.3); })}>Your avatar, on My Popkins</p>
  ${one(S, 'account-xs', 170, 74, 480, shown - S.BEAT, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your account · L2-048</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'All', { accent: 'yours.' })}</h1>
  </div>
  ${closeup('name-field', at(820, 380, 640), pop(S, onBeat(S, part('account', 1, 0.3)), { tilt: -1.5 }))}
  ${closeup('contact-field', at(900, 640, 700), pop(S, onBeat(S, part('account', 1, 0.55)), { tilt: 1.5 }))}
  </div>`;
});

Film.scene('save', (S) => `
  <div class="fill field--teal">
  <div style="${at(100, 80, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Save changes · L2-048</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Saved', { accent: 'just now.' })}</h1>
  </div>
  ${one(S, 'saved-xs', 1240, 74, 480, 0.1, 3)}
  ${closeup('saved', at(160, 520, 700) + onColour, pop(S, onBeat(S, said('save', 1)), { tilt: -2 }))}
  </div>`);

Film.scene('invalid', (S) => `
  <div class="fill field--paper">
  ${one(S, 'invalid-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>An empty name · L2-048</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Nothing', { accent: 'saved.' })}</h1>
  </div>
  ${closeup('summary', at(820, 380, 760), pop(S, onBeat(S, part('invalid', 0, 0.3)), { tilt: -1.5 }))}
  ${closeup('name-invalid', at(900, 660, 760), pop(S, onBeat(S, part('invalid', 0, 0.6)), { tilt: 1.5 }))}
  </div>`);

// ── Act 2: the theme and signing out ─────────────────────────────────────────────────────────────
Film.scene('theme', (S) => {
  const dark = onBeat(S, part('theme', 0, 0.55));
  return `
  <div class="fill field--night">
  <div style="${at(110, 80, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The theme · L2-048, L2-059</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Light or', { accent: 'dark.' })}</h1>
  </div>
  ${closeup('theme', at(130, 470, 640), pop(S, S.beat(3), { tilt: -2, until: dark }))}
  ${closeup('theme-dark', at(130, 470, 640), pop(S, dark, { tilt: -2 }))}
  ${one(S, 'account-xs', 1000, 80, 420, 0.1, -3)}
  ${one(S, 'account-xs-dark', 1420, 120, 420, dark, 4, 'dark')}
  </div>`;
}, { before: 0.3 });

Film.scene('signout', (S) => {
  const welcome = onBeat(S, said('signout', 1));
  return `
  <div class="fill field--coral">
  ${one(S, 'sign-out-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(760, 70, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Sign out · L2-048, L2-050</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Asks', { accent: 'first.' })}</h1>
  </div>
  ${closeup('sign-out-panel', at(760, 360, 660) + onColour, pop(S, onBeat(S, part('signout', 0, 0.2)), { tilt: -1.5, until: welcome }))}
  ${one(S, 'welcome-xs', 1340, 100, 440, welcome, 3)}
  <p class="kicker" style="${at(780, 500, 520)}" ${S.rise(welcome + S.BEAT)}>Then the welcome screen</p>
  </div>`;
}, { before: 0.3 });

// ── Act 3: the form factors ──────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const p = (t) => [S.beat(3), S.bar(2), S.bar(3)].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One column,', { accent: 'in the middle.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px">
    ${S.grow([
      { src: 'shots/account-xs.png', width: 390, height: 780 },
      { src: 'shots/account-m.png', width: 768, height: 1024 },
      { src: 'shots/account-l.png', width: 1024, height: 768 },
      { src: 'shots/account-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  </div>`;
}, { before: 0.3 });

// ── Act 4: what no screen shows, what is left, and the close ─────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  ${browser('shots/sign-out-xl.png', { width: 700, style: at(110, 330, 700), attrs: arrive(S, 0.1, -2, 4) })}
  <div style="${at(120, 90, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Ended at', { accent: 'once.' })}</h1>
  </div>
  <div style="${at(900, 190, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'A signed-out cookie gets 401 at once')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.7)), 'Other devices stay signed in')}
  </div>
  <div style="${at(900, 620, 900)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">A new name told to the others live.</p>
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

const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('theme', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-teal)');

Film.start();
