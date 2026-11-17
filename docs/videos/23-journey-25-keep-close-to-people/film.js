// Video 23 · Journey 25: Keep close to people. Thirteen scenes on a 120 BPM grid (one bar is two
// seconds). Every picture is a screenshot of the running app from shots.ts; every position is a
// pure function of the scene's time (docs/videos/README.md).
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
const win = (S, src, x, y, width, when, tilt = 0) =>
  browser(`shots/${src}.png`, { width, style: at(x, y, width), attrs: arrive(S, when, tilt, tilt + 5) });
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

// ── Act 1: every morning ───────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 25</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Keep people', { accent: 'close.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Contacts.</p>
  </div>
  ${one(S, 'today-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>`);

Film.scene('today', (S) => {
  const spot = onBeat(S, part('today', 0, 0.3));
  const todo = onBeat(S, said('today', 1));
  const drift = onBeat(S, part('today', 1, 0.6));
  return `
  <div class="fill field--sand">
  ${win(S, 'today-xl', 80, 300, 1180, 0.1, -1)}
  ${title(S, 'Today · L2-125', 'What matters,', 'this morning.', 110, 60, 1500)}
  ${closeup('spotlight', at(1160, 340, 700), pop(S, spot, { tilt: 1.5, until: todo }))}
  ${closeup('to-do', at(1260, 330, 560), pop(S, todo, { tilt: -1.5, until: drift }))}
  ${closeup('drift', at(1200, 420, 660), pop(S, drift, { tilt: 1 }))}
  </div>`;
}, { before: 0.3 });

Film.scene('add', (S) => `
  <div class="fill field--paper">
  ${one(S, 'add-xs', 160, 74, 480, 0.1, -3)}
  ${one(S, 'people-xs', 700, 130, 440, onBeat(S, part('add', 0, 0.6)), 3)}
  ${title(S, 'Add someone · L2-129', 'Only', 'you see them.', 1200, 200, 660)}
  </div>`, { before: 0.3 });

Film.scene('profile', (S) => `
  <div class="fill field--teal">
  ${title(S, 'Profile · L2-128', 'All of', 'Chidi.', 110, 90, 900)}
  ${closeup('habit', at(150, 470, 720) + onColour, pop(S, onBeat(S, part('profile', 0, 0.55)), { tilt: -1.5 }))}
  ${one(S, 'profile-xs', 1250, 80, 470, 0.1, 3)}
  </div>`, { before: 0.3 });

// ── Act 2: what you keep ────────────────────────────────────────────────────────────────────────
Film.scene('log', (S) => `
  <div class="fill field--coral">
  ${one(S, 'log-xs', 150, 74, 480, 0.1, -3)}
  ${title(S, 'Log · L2-133', 'A promise,', 'kept.', 800, 300, 1000)}
  </div>`, { before: 0.3 });

Film.scene('memories', (S) => `
  <div class="fill field--paper">
  ${title(S, 'Memories & files · L2-136', 'Keep the', 'moments.', 110, 60, 1600)}
  ${win(S, 'memories-xl', 80, 300, 1150, 0.1, -1)}
  ${one(S, 'memories-xs', 1330, 200, 440, onBeat(S, part('memories', 0, 0.5)), 3)}
  </div>`, { before: 0.3 });

Film.scene('dates', (S) => `
  <div class="fill field--sun">
  ${one(S, 'dates-xs', 120, 74, 460, 0.1, -3)}
  ${one(S, 'follow-ups-xs', 640, 110, 460, onBeat(S, part('dates', 0, 0.55)), 2)}
  ${title(S, 'Dates · Follow-ups', 'Never', 'forget.', 1180, 300, 700)}
  </div>`, { before: 0.3 });

Film.scene('habits', (S) => `
  <div class="fill field--sand">
  ${title(S, 'Habits · L2-143', 'Keep the', 'rhythm.', 110, 90, 900)}
  ${closeup('habit-lead', at(140, 470, 760), pop(S, onBeat(S, part('habits', 0, 0.4)), { tilt: -1.5 }))}
  ${one(S, 'habits-xs', 1250, 80, 470, 0.1, 3)}
  </div>`, { before: 0.3 });

Film.scene('connections', (S) => `
  <div class="fill field--paper">
  ${title(S, 'Connections · Groups', 'Who knows', 'whom.', 110, 60, 1600)}
  ${win(S, 'connections-xl', 80, 300, 1150, 0.1, -1)}
  ${one(S, 'groups-xs', 1330, 200, 440, onBeat(S, part('connections', 0, 0.55)), 3)}
  </div>`, { before: 0.3 });

Film.scene('import', (S) => `
  <div class="fill field--teal">
  ${one(S, 'import-xs', 150, 74, 480, 0.1, -3)}
  ${title(S, 'Import · L2-151', 'Nobody is', 'told.', 800, 90, 1000)}
  ${closeup('import-told', at(800, 470, 900) + onColour, pop(S, onBeat(S, part('import', 0, 0.5)), { tilt: -1 }))}
  ${closeup('import-button', at(860, 760, 700) + onColour, pop(S, onBeat(S, part('import', 0, 0.8)), { tilt: 1 }))}
  </div>`, { before: 0.3 });

// ── Act 3: every size, what the tests prove, and the close ──────────────────────────────────────
Film.scene('grow', (S) => `
  <div class="fill field--sand">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  ${one(S, 'today-xs', 110, 220, 380, S.beat(1), -2)}
  ${tablet('shots/today-m.png', { width: 520, style: at(520, 260, 520), attrs: arrive(S, S.beat(3), 1, 6) })}
  ${win(S, 'today-xl', 1080, 300, 780, onBeat(S, part('grow', 0, 0.55)), 1)}
  </div>`, { before: 0.3 });

Film.scene('proof', (S) => `
  <div class="fill field--paper">
  ${one(S, 'reminder-xs', 140, 74, 460, 0.1, -2)}
  ${title(S, 'What the tests prove', 'Quiet and', 'on time.', 720, 90, 1100)}
  <div style="${at(720, 420, 1080)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'Reminders at 9 am, where you are')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.75)), 'Nobody you add is ever told')}
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
wipeInto('log', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');

Film.start();
