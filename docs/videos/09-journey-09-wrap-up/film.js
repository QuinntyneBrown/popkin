// Video 09 · Journey 9: Wrap up. Twelve scenes on a 120 BPM grid (one bar is two seconds). Every
// picture is a screenshot of the running app from shots.ts; every position is a pure function of
// the scene's time (docs/videos/README.md).
const { enter, exit, ease, prog, lerp, clamp, phone, tablet } = Film;

const at = (x, y, w) => `position:absolute;left:${x}px;top:${y}px;width:${w}px`;

const lineOf = (id, n) => Film.timing.lines.filter((line) => line.scene === id)[n];
/** Scene time at which line `n` of scene `id` starts being spoken, so a picture lands on its word. */
const said = (id, n) => lineOf(id, n).start - Film.at(id);
/** Scene time at which the fraction `f` of line `n` has been spoken. */
const part = (id, n, f) => said(id, n) + (lineOf(id, n).end - lineOf(id, n).start) * f;
/** The same, moved to the beat at or after it: a cut belongs on the grid. */
const onBeat = (S, t) => Math.ceil(t / S.BEAT - 1e-6) * S.BEAT;
/** A headline whose accent words start a line of their own. */
const twoLines = (S, when, text, accent) => `${S.words(when, text)}<br>${S.words(when + 0.1, '', { accent })}`;

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
const states = (S, shots, cuts, { width, style, when = 0, tilt = 0, from = 12, theme = 'light' }) =>
  shots.map((src, i) => phone(`shots/${src}.png`, {
    width,
    style,
    theme,
    attrs: 'data-notch="off" ' + arrive(S, when, tilt, from, (t) => cuts.filter((c) => t >= c).length === i),
  })).join('');

/** One phone, without its notch. */
const one = (S, src, x, y, width, when, tilt, theme = 'light') =>
  phone(`shots/${src}.png`, { width, theme, style: at(x, y, width), attrs: 'data-notch="off" ' + arrive(S, when, tilt, tilt + 8) });

/** A close-up that pops in at `when` and, if `until` is given, leaves again. */
const pop = (S, when, { tilt = -2, until = Infinity } = {}) =>
  S.ref((el, t) => {
    const p = enter(t, when, 0.35, ease.back);
    el.style.opacity = t >= until ? 0 : clamp(p * 3);
    el.style.transform = `scale(${lerp(0.6, 1, p)}) rotate(${tilt}deg)`;
  });

const closeup = (src, style, attrs) => `<img class="closeup" src="shots/${src}.png" alt="" style="${style}" ${attrs}>`;
/**
 * A close-up of part of a picture: the rectangle x, y, w, h of the PNG (in its own pixels), drawn
 * `k` film pixels to each of them, at left, top. (`zoom` scales the picture's own offsets too.)
 */
const cut = (src, { x, y, w, h, k, left, top, ring = '' }, attrs) =>
  `<div class="closeup" style="position:absolute;left:${left}px;top:${top}px;width:${w * k}px;height:${h * k}px;overflow:hidden${ring}" ${attrs}>` +
  `<img src="shots/${src}.png" alt="" style="position:absolute;left:${-x}px;top:${-y}px;zoom:${k}"></div>`;
/** On a coral, sun or teal field the accent ring would vanish: the ring is white there. */
const onColour = ';outline-color:var(--palette-white)';
/** On the sun field white is faint too: the ring is black. */
const onSun = ';outline-color:var(--palette-black)';

/** Words of the film's own that are on screen from `from` until `until` (scene seconds). */
const during = (S, from, until) => S.ref((el, t) => {
  const p = enter(t, from, 0.3);
  el.style.opacity = t >= until ? 0 : p;
  el.style.transform = `translateY(${(1 - p) * 40}px)`;
});

/** A card of the film's own: a white surface for a short line, on any field. */
const card = 'box-sizing:border-box;background:var(--palette-white);color:var(--palette-ink);border-radius:var(--radius-lg);box-shadow:0 30px 60px -24px rgb(0 0 0 / 0.35)';
const fact = (S, n, when, text) => `<div style="${card};display:flex;align-items:center;gap:28px;margin-bottom:26px;padding:30px 40px;font:700 38px/1.2 var(--font-family-sans);outline:2px solid var(--palette-line)" ${S.rise(when, { y: 50 })}>
  <span style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--palette-teal-deep);color:var(--palette-white);font:900 34px/64px var(--font-family-display);text-align:center">${n}</span><span>${text}</span></div>`;

// ── Act 1: the Host wraps the Popkin up ─────────────────────────────────────────────────────────
Film.scene('hook', (S) => `
  <div class="fill field--night">${S.aurora((t) => enter(t, 0, 1.2) * 0.55)}
  <div style="${at(120, 190, 1100)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Journey 9</p>
    <h1 class="headline" style="margin-top:28px">${S.words(S.beat(2), 'Every good Popkin', { accent: 'ends.' })}</h1>
    <p class="lede" style="margin-top:40px" ${S.rise(S.bar(1))}>Wrap up.</p>
  </div>
  ${one(S, 'recap-xs-dark', 1290, 80, 470, S.beat(2), 5, 'dark')}
  </div>
`);

Film.scene('settings', (S) => {
  const dialog = onBeat(S, part('settings', 0, 0.3));
  const wrapUp = onBeat(S, part('settings', 0, 0.62));
  return `
  <div class="fill field--sand">
  ${states(S, ['home-xs', 'settings-xs'], [dialog], { width: 480, style: at(170, 74, 480), tilt: -3, from: -10 })}
  <div style="${at(800, 70, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Popkin settings · L2-020</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Popkin settings,', 'Wrap up.')}</h1>
  </div>
  ${cut('home-header', { x: 640, y: 4, w: 136, h: 110, k: 1.5, left: 830, top: 440 }, pop(S, S.beat(3), { tilt: -3, until: dialog }))}
  <p class="kicker" style="${at(1090, 490, 700)}" ${during(S, S.beat(4), dialog)}>“Popkin settings”,<br>on the Popkin home</p>
  ${closeup('settings-dialog', at(820, 380, 720), pop(S, dialog, { tilt: -1.5 }))}
  ${closeup('settings-wrap-up', at(1000, 830, 800), pop(S, wrapUp, { tilt: 1.5 }))}
  </div>`;
});

Film.scene('ask', (S) => {
  const facts = onBeat(S, part('ask', 0, 0.42));
  const keep = onBeat(S, said('ask', 1));
  const off = onBeat(S, part('ask', 1, 0.38));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 90, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrap up · L2-043</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'What happens', { accent: 'next.' })}</h1>
  </div>
  ${closeup('wrap-up-heading', at(130, 400, 700), pop(S, S.beat(3), { tilt: -1.5, until: facts }))}
  ${closeup('wrap-up-lead', at(130, 640, 700), pop(S, S.beat(6), { tilt: 1, until: facts }))}
  ${closeup('wrap-up-facts', at(130, 370, 840), pop(S, facts, { tilt: -1 }))}
  ${closeup('keep-on', at(520, 830, 700), pop(S, keep, { tilt: 1.5, until: off }))}
  ${closeup('keep-off', at(520, 830, 700), pop(S, off, { tilt: 1.5 }))}
  ${states(S, ['wrap-up-xs', 'wrap-up-album-off-xs'], [off], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
});

Film.scene('wrapping', (S) => {
  const busy = onBeat(S, part('wrapping', 0, 0.3));
  const opened = onBeat(S, part('wrapping', 0, 0.6));
  return `
  <div class="fill field--coral">
  ${states(S, ['wrap-up-xs', 'wrapping-up-xs', 'recap-host-xs'], [busy, opened], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 90, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Wrap it up · L2-043</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'Wrap it', { accent: 'up.' })}</h1>
  </div>
  ${closeup('wrap-it-up', at(820, 420, 760) + onColour, pop(S, S.beat(1), { tilt: -1.5, until: busy }))}
  ${closeup('wrapping-up', at(820, 420, 760) + onColour, pop(S, busy, { tilt: -1.5, until: opened }))}
  ${closeup('recap-lead', at(820, 360, 580) + onColour, pop(S, opened, { tilt: -1.5 }))}
  <p class="kicker" style="${at(1460, 560, 380)}" ${S.rise(opened + S.BEAT)}>The recap opens for everyone who has the Popkin open</p>
  </div>`;
});

// ── Act 2: the recap, the album, and what stays readable ────────────────────────────────────────
Film.scene('recap', (S) => {
  const counts = onBeat(S, said('recap', 1));
  return `
  <div class="fill field--teal">
  <div style="${at(120, 80, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The recap · L2-046</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), 'What a', { accent: 'time.' })}</h1>
    <p class="lede" style="margin-top:22px" ${S.rise(S.beat(4))}>Lakeside Weekend · Fri 11 – Sun 13 Sep</p>
  </div>
  ${closeup('recap-people', at(130, 420, 620) + onColour, pop(S, counts, { tilt: -1.5 }))}
  ${closeup('recap-stats', at(600, 590, 640) + onColour, pop(S, onBeat(S, part('recap', 1, 0.2)), { tilt: 1.5 }))}
  ${closeup('recap-moment', at(180, 810, 760) + onColour, pop(S, onBeat(S, part('recap', 1, 0.72)), { tilt: -1 }))}
  ${states(S, ['recap-xs', 'recap-card-xs'], [counts], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  ${S.confetti([S.beat(2)])}
  </div>`;
}, { before: 0.3 });

Film.scene('album', (S) => {
  const prep = onBeat(S, part('album', 0, 0.45));
  const going = onBeat(S, said('album', 1));
  return `
  <div class="fill field--sand">
  ${states(S, ['recap-actions-xs', 'recap-exporting-xs', 'recap-going-xs'], [prep, going], { width: 480, style: at(170, 74, 480), when: 0.1, tilt: -3, from: -10 })}
  <div style="${at(800, 80, 1040)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Save the album · L2-046</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Every photo,', { accent: 'in a zip.' })}</h1>
  </div>
  ${closeup('save-the-album', at(820, 420, 740), pop(S, S.beat(1), { tilt: -1.5, until: prep }))}
  ${cut('actions-exporting', { x: 0, y: 0, w: 740, h: 232, k: 1.15, left: 820, top: 410 }, pop(S, prep, { tilt: -1.5, until: going }))}
  <p class="kicker" style="${at(830, 740, 900)}" ${during(S, prep + S.BEAT, going)}>Its progress, while the zip is prepared</p>
  ${closeup('photos-go', at(820, 430, 960), pop(S, going, { tilt: 1 }))}
  <p class="kicker" style="${at(830, 640, 900)}" ${S.rise(going + S.BEAT)}>When the album was not kept · L2-045</p>
  </div>`;
});

Film.scene('readonly', (S) => {
  const two = onBeat(S, said('readonly', 1));
  const third = (src, x, n) => phone(`shots/${src}.png`, { width: 370, style: at(x, 290, 370), attrs: 'data-notch="off" ' + arrive(S, two + n * S.BEAT * 0.5, n - 1, n + 6) });
  return `
  <div class="fill field--paper">
  ${one(S, 'chat-read-only-xs', 130, 170, 410, 0.1, -3)}
  <div style="${at(640, 60, 1200)}">
    <p class="kicker" ${S.rise(S.beat(1))}>Read-only · L2-045</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'Still', { accent: 'readable.' })}</h1>
  </div>
  ${closeup('chat-top-bar', at(660, 360, 820), pop(S, S.beat(3), { tilt: -1, until: two }))}
  ${closeup('chat-closed', at(660, 600, 1120), pop(S, onBeat(S, part('readonly', 0, 0.3)), { tilt: 1, until: two }))}
  ${third('photos-wrapped-xs', 640, 0)}
  ${third('experiences-wrapped-xs', 1040, 1)}
  ${third('experience-wrapped-score-xs', 1440, 2)}
  </div>`;
});

// ── Act 3: the last hour, and what comes after ──────────────────────────────────────────────────
Film.scene('lasthour', (S) => {
  const banner = onBeat(S, part('lasthour', 0, 0.6));
  const everyone = onBeat(S, said('lasthour', 1));
  const itself = onBeat(S, part('lasthour', 2, 0.3));
  return `
  <div class="fill field--sun">
  <div style="${at(120, 90, 1150)}">
    <p class="kicker" ${S.rise(S.beat(1))}>The last hour · L2-044</p>
    <h1 class="headline headline--md" style="margin-top:24px">${S.words(S.beat(2), '1 hour', { accent: 'left.' })}</h1>
  </div>
  <p class="kicker" style="${at(140, 340, 900)}" ${S.rise(banner)}>The Host’s</p>
  ${closeup('banner-host', at(130, 390, 1000) + onSun, pop(S, banner, { tilt: -1 }))}
  <p class="kicker" style="${at(240, 640, 900)}" ${S.rise(everyone)}>A member’s, later in the hour</p>
  ${closeup('banner-member', at(230, 690, 920) + onSun, pop(S, everyone, { tilt: 1 }))}
  <p class="lede" style="${at(140, 900, 1100)};font-weight:700" ${S.rise(itself, { y: 40 })}>At 6 pm it wraps up by itself, album kept.</p>
  ${states(S, ['last-hour-xs', 'recap-xs'], [itself], { width: 460, style: at(1350, 90, 460), when: 0.1, tilt: 3 })}
  </div>`;
}, { before: 0.3 });

Film.scene('next', (S) => {
  const host = onBeat(S, part('next', 0, 0.25));
  const member = onBeat(S, part('next', 0, 0.68));
  return `
  <div class="fill field--coral">
  ${one(S, 'recap-host-actions-xs', 130, 74, 440, 0.1, -3)}
  <div style="${at(600, 80, 700)};text-align:center">
    <p class="kicker" ${S.rise(S.beat(1))}>After the recap · L2-046</p>
    <h1 class="headline headline--md" style="margin-top:20px">${S.words(S.beat(2), 'What’s', { accent: 'next?' })}</h1>
  </div>
  <p class="kicker" style="${at(630, 390, 660)}" ${S.rise(host)}>The Host</p>
  ${closeup('pop-up-another', at(620, 440, 680) + onColour, pop(S, host, { tilt: -1.5 }))}
  <p class="kicker" style="${at(630, 680, 660)};text-align:right" ${S.rise(member)}>A member</p>
  ${closeup('start-your-own', at(620, 730, 680) + onColour, pop(S, member, { tilt: 1.5 }))}
  ${phone('shots/recap-actions-xs.png', { width: 440, style: at(1350, 74, 440), attrs: 'data-notch="off" ' + arrive(S, member - S.BEAT, 3, 11) })}
  </div>`;
});

// ── Act 4: the form factors ─────────────────────────────────────────────────────────────────────
Film.scene('grow', (S) => {
  const two = onBeat(S, lineOf('grow', 0).end - Film.at('grow'));
  const three = onBeat(S, said('grow', 1));
  const four = onBeat(S, part('grow', 1, 0.6));
  const beside = onBeat(S, said('grow', 2)) - S.BEAT;
  const p = (t) => [two, three, four].reduce((sum, when) => sum + ease.inOut(prog(t, when, 0.8)), 0);
  const label = (from, until, text) => `<p class="lede" style="position:absolute;left:0;right:0;top:978px;text-align:center;font-weight:700" ${S.ref((el, t) => {
    el.style.opacity = t >= until ? 0 : enter(t, from, 0.3);
  })}>${text}</p>`;
  return `
  <div class="fill field--teal">
  <h1 class="headline headline--md" style="position:absolute;left:0;right:0;top:44px;text-align:center">${S.words(S.beat(1), 'One column,', { accent: 'then two.' })}</h1>
  <div style="position:absolute;left:0;right:0;top:196px" ${S.ref((el, t) => { el.style.visibility = t >= beside ? 'hidden' : 'visible'; })}>
    ${S.grow([
      { src: 'shots/recap-xs.png', width: 390, height: 780 },
      { src: 'shots/recap-m.png', width: 768, height: 1024 },
      { src: 'shots/recap-l.png', width: 1024, height: 768 },
      { src: 'shots/recap-xl.png', width: 1440, height: 900 },
    ], p, { height: 760 })}
  </div>
  ${tablet('shots/wrap-up-m.png', { width: 590, style: at(250, 190, 590), attrs: arrive(S, beside, -1, 6) })}
  ${cut('wrap-up-m', { x: 30, y: 480, w: 660, h: 920, k: 0.82, left: 1010, top: 215, ring: onColour }, pop(S, beside + S.BEAT * 2, { tilt: 2 }))}
  ${label(S.beat(2), two + 0.6, 'A phone: one column')}
  ${label(two + 0.6, three + 0.6, 'A tablet, 768 px: one column')}
  ${label(three + 0.6, four + 0.6, 'From 1024 px: the pictures beside the numbers and actions')}
  ${label(four + 0.6, beside, '1440 px')}
  ${label(beside + 0.3, Infinity, 'Wrap up, from 768 px: the recap it will make')}
  </div>`;
}, { before: 0.3 });

// ── Act 5: what no screen shows, what is left, and the close ────────────────────────────────────
Film.scene('proof', (S) => {
  const later = onBeat(S, said('proof', 1));
  return `
  <div class="fill field--paper">
  <div style="${at(120, 110, 800)}">
    <p class="kicker" ${S.rise(S.beat(1))}>What no screen shows</p>
    <h1 class="headline headline--md" style="margin-top:20px">${twoLines(S, S.beat(2), 'Nothing new', 'is added.')}</h1>
  </div>
  <div style="${at(120, 620, 720)}" ${S.rise(later, { y: 60 })}>
    <p class="kicker">Still to come</p>
    <p class="lede" style="margin-top:14px;font-weight:700">Change how long it lasts.</p>
  </div>
  <div style="${at(900, 250, 900)}">
    ${fact(S, 1, onBeat(S, part('proof', 0, 0.2)), 'Wrapped up, every request to add to it is refused')}
    ${fact(S, 2, onBeat(S, part('proof', 0, 0.7)), 'Only the Host can wrap a Popkin up')}
    ${fact(S, 3, onBeat(S, part('proof', 0, 1)), 'Its time up, it wraps up within one minute')}
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
wipeInto('recap', 'var(--palette-sun)');
wipeInto('lasthour', 'var(--palette-teal)');
wipeInto('grow', 'var(--palette-sun)');
wipeInto('proof', 'var(--palette-coral)');

Film.start();
