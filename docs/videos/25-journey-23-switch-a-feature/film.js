// Video 25 · Journey 23: Switch a feature. Ten scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running admin app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
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

// ── Act 1: the switches ────────────────────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 23</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Flip the', { accent: 'switch.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Switch a feature.</p>
  </div>
  ${win(S, 'features-xl-dark', 900, 260, 960, S.beat(2), 3, 'dark')}
  </div>`);

Film.scene('page', (S) => `
  <div class="fill field--sand">
  ${title(S, 'Features · L2-076', 'Who has', 'what.', 110, 60, 1600)}
  ${win(S, 'features-xl', 80, 300, 1100, 0.1, -1)}
  ${closeup('plan', at(1080, 330, 780), pop(S, onBeat(S, part('page', 0, 0.45)), { tilt: 1.5 }))}
  ${closeup('schedules', at(1040, 610, 820), pop(S, onBeat(S, part('page', 0, 0.75)), { tilt: -1 }))}
  </div>`, { before: 0.3 });

Film.scene('off', (S) => `
  <div class="fill field--coral">
  ${title(S, 'Turn it off · L2-076', 'Nothing is', 'deleted.', 110, 80, 900)}
  ${win(S, 'off-dialog-xl', 80, 400, 860, 0.1, -2)}
  ${closeup('off-dialog', at(1060, 70, 700) + onColour, pop(S, onBeat(S, part('off', 0, 0.3)), { tilt: 1.5 }))}
  </div>`, { before: 0.3 });

Film.scene('done', (S) => `
  <div class="fill field--paper">
  ${title(S, 'Schedules is off', 'Hidden', 'everywhere.', 110, 90, 1000)}
  ${closeup('schedules-off', at(120, 440, 900), pop(S, onBeat(S, part('done', 0, 0.2)), { tilt: -1 }))}
  ${closeup('off-toast', at(300, 760, 620), pop(S, onBeat(S, part('done', 0, 0.6)), { tilt: 1 }))}
  ${win(S, 'off-xl', 1100, 300, 760, 0.1, 2)}
  </div>`, { before: 0.3 });

// ── Act 2: on for everyone, or for chosen Popkins ───────────────────────────────────────────────
Film.scene('everyone', (S) => `
  <div class="fill field--teal">
  ${closeup('everyone-dialog', at(140, 90, 700) + onColour, pop(S, onBeat(S, part('everyone', 0, 0.2)), { tilt: -1.5 }))}
  ${title(S, 'Everyone · L2-076', 'On for', 'all.', 1000, 300, 860)}
  </div>`, { before: 0.3 });

Film.scene('chosen', (S) => {
  const added = onBeat(S, part('chosen', 0, 0.75));
  return `
  <div class="fill field--sun">
  ${title(S, 'Chosen Popkins · L2-076', 'Pick the', 'Popkins.', 110, 80, 900)}
  ${closeup('add-popkin', at(140, 380, 640), pop(S, onBeat(S, part('chosen', 0, 0.35)), { tilt: -1.5, until: added }))}
  ${closeup('schedules-four', at(100, 460, 900), pop(S, added, { tilt: 1 }))}
  ${win(S, 'add-popkin-xl', 1080, 300, 780, 0.1, 2)}
  </div>`;
}, { before: 0.3 });

Film.scene('support', (S) => `
  <div class="fill field--sand">
  ${win(S, 'support-xl', 80, 300, 1100, 0.1, -1)}
  ${title(S, 'Support · L2-076', 'Owners', 'only.', 110, 60, 1600)}
  ${closeup('support-schedules', at(1060, 470, 800), pop(S, onBeat(S, part('support', 0, 0.5)), { tilt: 1.5 }))}
  </div>`, { before: 0.3 });

// ── Act 3: every size, what the tests prove, and the close ──────────────────────────────────────
Film.scene('grow', (S) => `
  <div class="fill field--paper">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'Phone to', { accent: 'desktop.' })}</h1>
  ${one(S, 'features-xs', 110, 220, 380, S.beat(1), -2)}
  ${tablet('shots/features-m.png', { width: 520, style: at(520, 260, 520), attrs: arrive(S, S.beat(3), 1, 6) })}
  ${win(S, 'features-xl', 1080, 300, 780, onBeat(S, part('grow', 0, 0.55)), 1)}
  </div>`, { before: 0.3 });

Film.scene('proof', (S) => `
  <div class="fill field--paper">
  ${one(S, 'features-xs', 140, 74, 460, 0.1, -2)}
  ${title(S, 'What the tests prove', 'Safe to', 'retry.', 720, 90, 1100)}
  <div style="${at(720, 420, 1080)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.3)), 'A failed change changes nothing')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.75)), 'Your reason is kept to try again')}
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
wipeInto('everyone', 'var(--palette-sun)');
wipeInto('grow', 'var(--palette-coral)');

Film.start();
