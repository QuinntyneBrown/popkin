// Video 24 · Journey 24: Open the admin app. Eleven scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running admin app from shots.ts; every position
// is a pure function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet, browser } = Film;

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
const win = (S, src, x, y, width, when, tilt = 0, theme = 'light') =>
  browser(`shots/${src}.png`, { width, theme, url: 'admin.popkin.community', style: at(x, y, width), attrs: arrive(S, when, tilt, tilt + 5) });
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });
const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
const onColour = ';outline-color:var(--palette-white)';
const title = (S, kicker, words, accent, x, y, w) => `
  <div style="${at(x, y, w)}">
    <p class="kicker" ${S.rise(S.beat(1))}>${kicker}</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), words, { accent })}</h1>
  </div>`;
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: getting in ──────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 24</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'The', { accent: 'console.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Open the admin app.</p>
  </div>
  ${win(S, 'audit-xl-dark', 900, 260, 960, S.beat(2), 3, 'dark')}
  </div>`);

Film.scene('signin', (S) => `
  <div class="fill field--sand">
  ${one(S, 'sign-in-xs', 160, 74, 480, 0.1, -3)}
  ${title(S, 'Sign in · L2-088', 'Staff', 'email first.', 800, 300, 1000)}
  </div>`, { before: 0.3 });

Film.scene('code', (S) => `
  <div class="fill field--paper">
  ${title(S, 'Sign in · L2-088', 'A code,', '10 minutes.', 110, 90, 1000)}
  ${closeup('code-sent', at(140, 470, 900), pop(S, onBeat(S, part('code', 0, 0.4)), { tilt: -1.5 }))}
  ${one(S, 'code-xs', 1250, 80, 470, 0.1, 3)}
  </div>`, { before: 0.3 });

Film.scene('audit', (S) => {
  const row = onBeat(S, part('audit', 0, 0.5));
  return `
  <div class="fill field--teal">
  ${win(S, 'audit-xl', 80, 300, 1180, 0.1, -1)}
  ${title(S, 'Audit log · L2-120', 'Every action,', 'kept.', 110, 60, 1500)}
  ${closeup('audit-row', at(240, 820, 1440) + onColour, pop(S, row, { tilt: 1.5 }))}
  ${closeup('me', at(1260, 760, 520) + onColour, pop(S, onBeat(S, said('audit', 1)), { tilt: -1.5 }))}
  </div>`;
}, { before: 0.3 });

// ── Act 2: who can sign in ──────────────────────────────────────────────────────────────────────
Film.scene('admins', (S) => `
  <div class="fill field--paper">
  ${title(S, 'Admins & roles · L2-119', 'Who can', 'sign in.', 110, 60, 1600)}
  ${win(S, 'admins-xl', 80, 300, 1180, 0.1, -1)}
  ${one(S, 'admins-xs', 1360, 200, 420, onBeat(S, part('admins', 0, 0.55)), 3)}
  </div>`, { before: 0.3 });

Film.scene('add', (S) => {
  const invited = onBeat(S, part('add', 0, 0.6));
  return `
  <div class="fill field--sun">
  ${title(S, 'Add admin · L2-119', 'Invited', 'by code.', 110, 90, 800)}
  ${closeup('add-admin', at(130, 380, 700), pop(S, onBeat(S, part('add', 0, 0.2)), { tilt: -1.5, until: invited }))}
  ${closeup('invited-row', at(110, 520, 820), pop(S, invited, { tilt: 1 }))}
  ${win(S, 'invited-xl', 980, 300, 880, 0.1, 2)}
  </div>`;
}, { before: 0.3 });

Film.scene('role', (S) => `
  <div class="fill field--coral">
  ${title(S, 'Change role · L2-119', 'With a', 'reason.', 110, 80, 800)}
  ${closeup('change-role', at(1000, 70, 680) + onColour, pop(S, onBeat(S, part('role', 0, 0.3)), { tilt: 1.5 }))}
  ${win(S, 'change-role-xl', 80, 380, 860, 0.1, -2)}
  </div>`, { before: 0.3 });

Film.scene('roles', (S) => `
  <div class="fill field--sand">
  ${win(S, 'roles-xl', 300, 260, 1320, 0.1, 0)}
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:60px;text-align:center">${S.words(S.beat(1), 'Owner, Support,', { accent: 'Viewer.' })}</h1>
  </div>`, { before: 0.3 });

// ── Act 3: every size, what the tests prove, and the close ──────────────────────────────────────
Film.scene('grow', (S) => `
  <div class="fill field--paper">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  ${one(S, 'audit-xs', 110, 220, 380, S.beat(1), -2)}
  ${tablet('shots/audit-m.png', { width: 520, style: at(520, 260, 520), attrs: arrive(S, S.beat(3), 1, 6) })}
  ${win(S, 'audit-xl', 1080, 300, 780, onBeat(S, part('grow', 0, 0.55)), 1)}
  </div>`, { before: 0.3 });

Film.scene('proof', (S) => `
  <div class="fill field--paper">
  ${one(S, 'audit-after-sign-in-xs', 140, 74, 460, 0.1, -2)}
  ${title(S, 'What the tests prove', 'Admins', 'only.', 720, 90, 1100)}
  <div style="${at(720, 420, 1080)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'A code that isn’t an admin’s is turned away')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.75)), 'There is always one Owner')}
  </div>
  </div>`, { before: 0.3 });

Film.scene('close', (S) => `
  <div class="fill field--night">${S.aurora((t) => 1 - exit(t, S.length - 2.5, 2.5) * 0.6)}
  <div style="position:absolute;left:0;right:0;top:360px;text-align:center">
    <p class="wordmark" ${S.rise(S.beat(1), { y: 40 })}>Popkin</p>
    <p class="lede" style="margin-top:48px" ${S.rise(S.bar(1))}>A free platform for pop-up communities.</p>
  </div>
  </div>`);

const wipeInto = (id, color) => Film.overlay((S) => S.wipe((T) => prog(T, Film.at(id) - 0.3, 0.6), color));
wipeInto('admins', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');

Film.start();
