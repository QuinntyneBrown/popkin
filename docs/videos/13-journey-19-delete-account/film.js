// Video 13 · Journey 19: Delete account. Eight scenes on a 120 BPM grid (one bar is two seconds).
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

// ── Act 1: what goes, and what stays ───────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 19</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Time to', { accent: 'go.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Delete account.</p>
  </div>
  ${one(S, 'dialog-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('open', (S) => `
  <div class="fill field--sand">
  ${one(S, 'account-xs', 170, 74, 480, 0.1, -3)}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your account · L2-049</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Delete my', { accent: 'account.' })}</h1>
  </div>
  ${closeup('menu', at(820, 450, 760), pop(S, onBeat(S, part('open', 0, 0.4)), { tilt: -1.5 }))}
  </div>`);

Film.scene('what', (S) => {
  const kept = onBeat(S, said('what', 1));
  const hosted = onBeat(S, said('what', 2));
  return `
  <div class="fill field--paper">
  ${one(S, 'dialog-xs', 140, 74, 480, 0.1, -3)}
  <div style="${at(780, 70, 1060)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Delete your account? · L2-049</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'What goes,', { accent: 'what stays.' })}</h1>
  </div>
  ${closeup('removed', at(800, 360, 900), pop(S, onBeat(S, part('what', 0, 0.2)), { tilt: -1 }))}
  ${closeup('kept', at(860, 560, 900), pop(S, kept, { tilt: 1 }))}
  ${closeup('hosted', at(820, 740, 900), pop(S, hosted, { tilt: -1.5 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('confirm', (S) => {
  const typed = onBeat(S, part('confirm', 0, 0.7));
  return `
  <div class="fill field--coral">
  <div style="${at(110, 80, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Type delete · L2-049</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'One word', { accent: 'first.' })}</h1>
  </div>
  ${closeup('delete-disabled', at(140, 420, 760) + onColour, pop(S, S.beat(3), { tilt: -1.5, until: typed }))}
  ${closeup('confirm-typed', at(140, 380, 760) + onColour, pop(S, typed, { tilt: -1.5 }))}
  ${closeup('delete-enabled', at(180, 600, 760) + onColour, pop(S, typed + S.BEAT, { tilt: 1.5 }))}
  ${one(S, 'confirm-xs', 1250, 80, 470, 0.1, 3)}
  </div>`;
}, { before: 0.3 });

// ── Act 2: deleted ───────────────────────────────────────────────────────────────────────────────
Film.scene('done', (S) => {
  const landing = onBeat(S, part('done', 0, 0.3));
  return `
  <div class="fill field--teal">
  ${one(S, 'busy-xs', 120, 74, 460, 0.1, -3)}
  ${one(S, 'landing-xs', 650, 110, 460, landing, 2)}
  <div style="${at(1180, 110, 680)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Deleted · L2-049</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Signed out,', { accent: 'for good.' })}</h1>
  </div>
  ${closeup('toast', at(1160, 520, 700) + onColour, pop(S, onBeat(S, part('done', 0, 0.65)), { tilt: -1.5 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('grow', (S) => `
  <div class="fill field--sand">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'A sheet, then', { accent: 'a panel.' })}</h1>
  ${one(S, 'dialog-xs', 150, 220, 400, S.beat(1), -2)}
  ${browser('shots/dialog-xl.png', { width: 1180, style: at(640, 240, 1180), attrs: arrive(S, onBeat(S, part('grow', 0, 0.5)), 1, 6) })}
  </div>`, { before: 0.3 });

// ── Act 3: what no screen shows, and the close ───────────────────────────────────────────────────
Film.scene('erase', (S) => `
  <div class="fill field--paper">
  ${browser('shots/landing-xl.png', { width: 700, style: at(110, 360, 700), attrs: arrive(S, 0.1, -2, 4) })}
  <div style="${at(120, 90, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What the tests prove</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Erased in', { accent: '30 days.' })}</h1>
  </div>
  <div style="${at(900, 360, 900)}">
    ${fact(S, 1, onBeat(S, part('erase', 0, 0.25)), 'Name, number and photo erased')}
    ${fact(S, 2, onBeat(S, part('erase', 0, 0.75)), 'Messages stay, from “Former member”')}
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

const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('done', 'var(--palette-sun)');
wipeInto('erase', 'var(--palette-coral)');

Film.start();
