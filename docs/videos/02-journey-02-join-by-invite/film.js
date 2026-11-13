// Video 02 · Journey 2: Join by invite. Fourteen scenes on a 120 BPM grid (one bar is two seconds).
// Every picture is a screenshot of the running app from shots.ts; every position is a pure
// function of the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet, browser } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n].start - Film.at(id);

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

/** A close-up with the top `cut` (a share of its height) kept out of the frame. */
const cropped = (src, style, cut, attrs) =>
  `<div class="closeup closeup--cropped" style="${style};aspect-ratio:1 / ${1 - cut}" ${attrs}><img src="shots/${src}.png" alt="" style="margin-top:-${cut * 100}%"></div>`;
const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/** On a coral field the accent ring would vanish: the ring is white there. */
const onCoral = ';outline-color:var(--palette-white)';

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';

// ── Act 1: a link arrives, on the dark ──────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 210, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 2</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Join by', { accent: 'invite.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(2))}>From a link to a welcome.</p>
  </div>
  ${phone('shots/invite-xs-dark.png', { width: 470, theme: 'dark', style: at(1260, 80, 470), attrs: arrive(S, S.beat(2), 5) })}
  </div>
`);

// ── Act 2: the invite, and how little it gives away ─────────────────────────────────────────────
Film.scene('invite', (S) => `
  <div class="fill field--sand">
  ${phone('shots/invite-xs.png', { width: 480, style: at(190, 74, 480), attrs: arrive(S, 0, -3, -10) })}
  <div style="${at(820, 150, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The invite · L2-012</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'See what you’re', { accent: 'joining.' })}</h1>
  </div>
  ${closeup('invite-pill', at(840, 500, 500), pop(S, S.beat(5), { tilt: -2 }))}
  ${closeup('invite-avatars', at(1370, 660, 440), pop(S, S.beat(10), { tilt: 2 }))}
  ${closeup('invite-time', at(880, 810, 580), pop(S, S.beat(12), { tilt: -1 }))}
  </div>
`);

Film.scene('visitor', (S) => {
  const no = said('visitor', 1);
  const line = (when, text) => `<p style="margin:22px 0 0;font:800 56px/1.15 var(--font-family-display)" ${S.rise(when, { y: 40 })}>${text}</p>`;
  return `
  <div class="fill field--coral">
  <div style="${at(120, 130, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Before you join · L2-012</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Only', { accent: 'this.' })}</h1>
    <div style="margin-top:70px">
      ${line(no, 'No other names.')}
      ${line(no + 1.5 * S.BEAT * 2 - 0.5, 'No messages.')}
      ${line(no + 2 * S.BAR - 1.5, 'No photos of the Popkin.')}
    </div>
  </div>
  ${closeup('invite-preview', at(1060, 170, 720) + onCoral, pop(S, S.beat(1), { tilt: 2 }))}
  </div>`;
});

// ── Act 3: the same invite on every form factor ─────────────────────────────────────────────────
Film.scene('grow', (S) => `
  <div class="fill field--sun">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:64px;text-align:center">${S.words(S.beat(1), 'One link,', { accent: 'every size.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:236px">
    ${S.grow([
      { src: 'shots/invite-xs.png', width: 390, height: 780 },
      { src: 'shots/invite-m.png', width: 768, height: 1024 },
      { src: 'shots/invite-l.png', width: 1024, height: 768 },
      { src: 'shots/invite-xl.png', width: 1440, height: 900 },
    ], (t) => ease.inOut(prog(t, S.beat(2), 1.5)) + ease.inOut(prog(t, S.beat(6), 1.5)) + ease.inOut(prog(t, S.beat(10), 1.5)), { height: 780 })}
  </div>
  </div>
`, { before: 0.3 });

// ── Act 4: joining ──────────────────────────────────────────────────────────────────────────────
Film.scene('signup', (S) => `
  <div class="fill field--paper">
  ${phone('shots/sign-up-xs.png', { width: 480, style: at(190, 74, 480), attrs: arrive(S, 0.1, -3, -10) })}
  <div style="${at(820, 170, 1000)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Join · L2-012</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'New here?', { accent: 'Six digits.' })}</h1>
  </div>
  ${closeup('code-field', at(840, 540, 800), pop(S, S.beat(6), { tilt: -2 }))}
  </div>
`, { before: 0.3 });

Film.scene('profile', (S) => `
  <div class="fill field--teal">
  <div style="${at(120, 190, 900)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your profile · L2-013</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Name first.', { accent: 'Photo optional.' })}</h1>
    <p class="lede" style="margin-top:44px" ${S.rise(said('profile', 1))}>“First name is plenty.”</p>
  </div>
  ${tablet('shots/profile-m.png', { width: 700, style: at(1110, 70, 700), attrs: arrive(S, 0, 2, 8) })}
  </div>
`);

Film.scene('photo', (S) => {
  const label = (x, when, text) => `<p class="kicker" style="${at(x, 890, 440)};text-align:center" ${S.rise(when)}>${text}</p>`;
  return `
  <div class="fill field--sand">
  <h1 class="headline headline--md" style="${at(120, 100, 1150)}">${S.words(S.beat(1), 'Your initial,', { accent: 'or your face.' })}</h1>
  ${cropped('photo-initial', at(140, 440, 420), 0.1, pop(S, S.beat(1), { tilt: -3 }))}
  ${label(130, S.beat(2), 'No photo')}
  <p class="headline headline--md" style="${at(585, 560, 100)};text-align:center" ${S.rise(S.beat(3), { y: 0 })}>→</p>
  ${cropped('photo-chosen', at(710, 440, 420), 0.1, pop(S, S.beat(4), { tilt: 3 }))}
  ${label(700, S.beat(5), '“Looking good.”')}
  ${phone('shots/profile-photo-xs.png', { width: 470, style: at(1320, 80, 470), attrs: 'data-notch="off" ' + arrive(S, 0, 4) })}
  </div>`;
});

Film.scene('care', (S) => {
  const server = Math.ceil(said('care', 1) / S.BEAT) * S.BEAT;
  const step = (n, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:22px;padding:24px 36px;font:700 40px/1.2 var(--font-family-sans)" ${S.rise(server + n * S.BAR / 2, { y: 50 })}>
    <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n + 1}</span>${text}</div>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 130, 880)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Your photo · L2-013</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Handled with', { accent: 'care.' })}</h1>
    <p class="lede" style="margin-top:44px" ${S.rise(S.bar(1))}>JPEG, PNG, WebP or HEIC, up to 10 MB.</p>
  </div>
  ${closeup('photo-refused', at(130, 600, 820), pop(S, S.beat(10), { tilt: -2 }))}
  <div style="${at(1080, 150, 730)}">
    ${step(0, 'Checked by its bytes')}
    ${step(1, 'Turned upright')}
    ${step(2, 'Shrunk to 512 px at most')}
    ${step(3, 'Saved again as a JPEG')}
    ${step(4, 'Location and device data removed')}
    ${step(5, 'Its address expires in an hour')}
  </div>
  </div>`;
});

// ── Act 5: in ───────────────────────────────────────────────────────────────────────────────────
Film.scene('welcome', (S) => `
  <div class="fill field--night">${S.aurora(() => 0.8, { horizon: 0.7 })}
  <div style="${at(120, 130, 580)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Welcome · L2-014</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'You’re', { accent: 'in!' })}</h1>
  </div>
  ${browser('shots/welcome-l.png', { width: 1100, ratio: 1024 / 768, url: 'popkin.app/i/…/welcome', style: at(730, 110, 1100), attrs: arrive(S, 0.1, 0, 0) })}
  ${closeup('welcome-arrival', at(150, 500, 450), pop(S, said('welcome', 1), { tilt: -3 }))}
  ${S.confetti([S.beat(3), S.bar(3)])}
  </div>
`, { before: 0.3 });

Film.scene('wider', (S) => `
  <div class="fill field--coral">
  <h1 class="headline headline--md" style="${at(120, 70, 1300)};font-size:82px">${S.words(S.beat(1), 'Wider screens show', { accent: 'who’s in.' })}</h1>
  ${browser('shots/profile-xl.png', { width: 1250, url: 'popkin.app/i/…/profile', style: at(110, 205, 1250), attrs: arrive(S, 0, 0, 0) })}
  ${phone('shots/welcome-xs-dark.png', { width: 440, theme: 'dark', style: at(1350, 150, 440), attrs: arrive(S, S.beat(8), 4) })}
  </div>
`);

// ── Act 6: invites that cannot be joined ────────────────────────────────────────────────────────
Film.scene('cannot', (S) => `
  <div class="fill field--sand">
  <div style="${at(120, 130, 880)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Invites that cannot be joined · L2-016</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Some invites', { accent: 'are over.' })}</h1>
  </div>
  ${closeup('wrapped-line', at(130, 620, 780), pop(S, S.beat(5), { tilt: -2 }))}
  ${phone('shots/wrapped-xs.png', { width: 400, style: at(1020, 110, 400), attrs: 'data-notch="off" ' + arrive(S, 0, -3, -10) })}
  ${phone('shots/not-found-xs.png', { width: 400, style: at(1440, 230, 400), attrs: 'data-notch="off" ' + arrive(S, S.beat(11), 3) })}
  </div>
`);

// ── Act 7: what the tests prove, what is left, the close ────────────────────────────────────────
Film.scene('proof', (S) => {
  const count = (x, when, n, text) => `<div style="${at(x, 380, 560)};text-align:center" ${S.rise(when, { y: 60 })}>
    <p class="figure accent" style="font-size:220px">${n}</p>
    <p class="kicker" style="margin-top:24px">${text}</p></div>`;
  return `
  <div class="fill field--teal">
  <div style="position:absolute;left:0;right:0;top:80px;text-align:center">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Proven by', { accent: 'tests.' })}</h1>
  </div>
  ${count(120, S.bar(1), 88, 'API tests')}
  ${count(680, S.beat(6), 118, 'behaviour specs')}
  ${count(1240, S.bar(2), 344, 'comparisons with the designs')}
  <p class="lede" style="position:absolute;left:0;right:0;top:800px;text-align:center" ${S.rise(S.bar(2) + S.BEAT)}>A member who opens the invite goes straight to their Popkin.</p>
  <p class="lede" style="position:absolute;left:0;right:0;top:880px;text-align:center" ${S.rise(S.bar(3) + S.BEAT)}>Guessing codes: 20 lookups per address in 10 minutes.</p>
  </div>`;
}, { before: 0.3 });

Film.scene('left', (S) => {
  const later = Math.ceil(said('left', 1) / S.BEAT) * S.BEAT;
  const choice = (x, when, title, text) => `<div style="${at(x, 400, 810)};${card};height:250px;padding:40px 48px" ${S.rise(when, { y: 50 })}>
    <p style="margin:0;font:900 52px/1.1 var(--font-family-display)">${title}</p>
    <p class="lede" style="margin-top:16px;font-size:34px">${text}</p></div>`;
  const journey = (x, when, text) => `<p style="${at(x, 838, 300)};margin:0;font:700 32px/1.25 var(--font-family-sans)" ${S.rise(when)}>${text}</p>`;
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 1500)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Left for the owner</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Two choices,', { accent: 'still open.' })}</h1>
  </div>
  ${choice(120, S.bar(1), 'The photo store', 'In development, photos stay on local disk.')}
  ${choice(990, S.bar(3), 'Who sends the code', 'The SMS and email providers are not chosen.')}
  <p class="kicker" style="${at(120, 730, 900)}" ${S.rise(later)}>Not built yet</p>
  ${closeup('welcome-say-hi', at(130, 810, 520), pop(S, later, { tilt: -1 }))}
  ${journey(690, later, 'The chat:<br>journey 3')}
  ${closeup('welcome-see-photos', at(1000, 810, 520), pop(S, later + S.BAR / 2, { tilt: 1 }))}
  ${journey(1560, later + S.BAR / 2, 'The album:<br>journey 5')}
  </div>`;
});

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
wipeInto('signup', 'var(--palette-teal)');
wipeInto('welcome', 'var(--palette-coral)');
wipeInto('proof', 'var(--palette-sun)');

Film.start();
