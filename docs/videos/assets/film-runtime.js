// The runtime of a Popkin film (docs/videos/README.md). A film is a list of scenes on the bar grid
// that tools/video-audio/film_audio.py writes to timing.js. Every pixel is a pure function of film
// time: the same page plays live against the mixed MP3 and is rendered frame by frame by
// tools/video-build/build.mjs, which calls window.seek(seconds). Nothing here uses a CSS animation,
// a CSS transition, a timer or Math.random; a film.js must not either.
//
// slides.html loads, in order: tokens.css, film.css, timing.js, this file, film.js.
// film.js calls Film.scene(...) once per scene, Film.overlay(...) for what crosses scenes, then
// Film.start().
(() => {
  const W = 1920, H = 1080;
  const query = new URLSearchParams(location.search);
  const RENDER = query.has('render');
  const TIMING = window.FILM_TIMING;
  const errors = [];
  if (!TIMING) throw new Error('timing.js is missing: run tools/video-audio/film_audio.py <folder> (or --grid) first');

  // ── The clock and the pure helpers ────────────────────────────────────────────────────────────
  const BEAT = TIMING.beat, BAR = TIMING.bar, DURATION = TIMING.duration;
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
  const lerp = (a, b, p) => a + (b - a) * p;
  /** 0→1 progress of t through [at, at + dur]. */
  const prog = (t, at, dur) => clamp((t - at) / dur);
  const ease = {
    linear: (p) => p,
    /** Every entrance: fast, then settling. */
    out: (p) => 1 - Math.pow(1 - p, 5),
    outExpo: (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
    inOut: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
    /** Exits only. */
    in: (p) => p * p * p * p,
    /** A small overshoot (about 6 %) for stamps and pops. */
    back: (p) => 1 + 2.2 * Math.pow(p - 1, 3) + 1.2 * Math.pow(p - 1, 2),
  };
  const enter = (t, at, dur = 0.3, curve = ease.out) => curve(prog(t, at, dur));
  const exit = (t, at, dur = 0.24, curve = ease.in) => curve(prog(t, at, dur));
  /** A sharp attack at each listed time that decays as e^(−decay·Δt): a hit on the beat. */
  const pulse = (t, times, decay = 10) => times.reduce((acc, at) => (t >= at ? Math.max(acc, Math.exp(-(t - at) * decay)) : acc), 0);
  /** A random source that gives the same numbers on every pass. */
  const seeded = (seed) => {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let r = Math.imul(s ^ (s >>> 15), 1 | s);
      r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  /** A design token as #rrggbb, for a canvas or a shader: token('--palette-coral'). */
  const probe = document.createElement('canvas').getContext('2d');
  const token = (name) => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (!value) throw new Error(`${name} is not a token of docs/design-system/tokens/tokens.css`);
    probe.fillStyle = '#000';
    probe.fillStyle = value;
    return probe.fillStyle;
  };

  // ── Device frames: the screenshot inside a phone, a tablet or a browser window ───────────────
  // Each returns markup. `width` is the frame's width in film pixels; `ratio` the window the shot
  // was taken in (width / height); `style` places the frame and `attrs` takes S.ref(...) to move it.
  const device = (kind, bar) => (src, { width, ratio, theme = 'light', style = '', attrs = '', url = 'popkin.app' } = {}) =>
    `<div class="device device--${kind}" data-theme="${theme}" style="--w:${width}px;--ratio:${ratio};${style}" ${attrs}>` +
    (bar ? `<div class="device__bar"><i></i><i></i><i></i><span class="device__url">${esc(url)}</span></div>` : '') +
    `<img class="device__screen" src="${esc(src)}" alt=""></div>`;
  const phone = (src, o = {}) => device('phone')(src, { width: 400, ratio: 390 / 780, ...o });
  const tablet = (src, o = {}) => device('tablet')(src, { width: 640, ratio: 768 / 1024, ...o });
  const browser = (src, o = {}) => device('browser', true)(src, { width: 1240, ratio: 1440 / 900, ...o });

  // ── Scenes ───────────────────────────────────────────────────────────────────────────────────
  // build(S) returns the scene's markup. S.ref(fn) returns an attribute that marks an element and
  // registers fn(el, t), called on every frame the scene shows with the scene's own time in
  // seconds (0 at its start; negative during `before`). Everything below is built on S.ref.
  function makeScene(root, build, start, length) {
    const fns = [];
    const S = {
      start, length, BEAT, BAR,
      /** Scene time of beat k (0-based, fractions allowed) and of bar k. */
      beat: (k) => k * BEAT,
      bar: (k) => k * BAR,
      ref(fn) { fns.push(fn); return `data-r="${fns.length - 1}"`; },

      /** Words that rise out of a mask one by one from `at`. Words of `accent` follow, in the accent colour. */
      words(at, text, { accent = '', stagger = 0.05, dur = 0.3 } = {}) {
        const list = [...text.split(' ').filter(Boolean).map((w) => [w, '']), ...accent.split(' ').filter(Boolean).map((w) => [w, ' accent'])];
        return list.map(([w, cls], i) => `<span class="word"><span class="word__in${cls}" ${S.ref((el, t) => {
          const p = enter(t, at + i * stagger, dur);
          el.style.transform = `translateY(${(1 - p) * 0.9}em)`;
          el.style.opacity = p;
        })}>${esc(w)}</span></span>`).join(' ');
      },

      /** Attributes for an element that fades and rises in at `at`: <p ${S.rise(S.beat(2))}>. */
      rise(at, { dur = 0.3, y = 24 } = {}) {
        return S.ref((el, t) => {
          const p = enter(t, at, dur);
          el.style.opacity = p;
          el.style.transform = `translateY(${(1 - p) * y}px)`;
        });
      },

      /** A slab of colour that crosses the frame: p(t) 0 = off left, 0.5 = covering, 1 = off right. */
      wipe(p, color = 'var(--color-accent)') {
        return `<div class="wipe" style="background:${color}" ${S.ref((el, t) => {
          const v = p(t);
          el.style.display = v <= 0 || v >= 1 ? 'none' : 'block';
          el.style.transform = `translateX(${(v - 0.5) * 2 * (W + 360)}px) skewX(-8deg)`;
        })}></div>`;
      },

      /**
       * One screen growing through its form factors. shots: [{ src, width, height }] in the order
       * they appear (the window each was taken in); p(t) runs 0 → shots.length − 1. The frame keeps
       * `height` film pixels and widens; each shot takes over from the one before in the middle
       * of its step. Shots at every size (390, 768, 1024, 1440) make the growth read best.
       */
      grow(shots, p, { height = 760, style = '', attrs = '' } = {}) {
        const imgs = shots.map((s, i) => `<img src="${esc(s.src)}" alt="" ${S.ref((el, t) => { el.style.opacity = i === 0 ? 1 : prog(p(t), i - 0.65, 0.3); })}>`).join('');
        return `<div class="device device--grow" style="height:${height}px;${style}" ${attrs}><div class="device__grow" ${S.ref((el, t) => {
          const v = clamp(p(t), 0, shots.length - 1);
          const i = Math.min(shots.length - 2, Math.floor(v));
          const ratio = shots.length < 2 ? shots[0].width / shots[0].height
            : lerp(shots[i].width / shots[i].height, shots[i + 1].width / shots[i + 1].height, v - i);
          el.style.width = `${height * ratio}px`;
          // A phone's corners, then a window's.
          el.style.borderRadius = `${lerp(56, 18, clamp((ratio - 0.5) / 0.6))}px`;
        })}>${imgs}</div></div>`;
      },

      /** The aurora, a WebGL field of three token colours over a ground: intensity(t) is 0..1.5. */
      aurora(intensity = () => 1, { horizon = 0.62, colors = ['--palette-night-deep', '--palette-coral', '--palette-accent-plum', '--palette-sun'] } = {}) {
        let draw = null;
        return `<canvas width="960" height="540" class="fill" ${S.ref((el, t) => {
          draw ??= aurora(el, horizon, colors.map(token));
          draw(start + t, intensity(t));
        })}></canvas>`;
      },

      /** Confetti from both lower corners at each time in `bursts` (scene seconds). */
      confetti(bursts, { count = 140, seed = 7, colors = ['--palette-coral', '--palette-sun', '--palette-teal', '--palette-accent-sky', '--palette-accent-plum'] } = {}) {
        let palette = null;
        return `<canvas width="${W}" height="${H}" class="fill" ${S.ref((el, t) => {
          palette ??= colors.map(token);
          confetti(el.getContext('2d'), t, bursts, count, seed, palette);
        })}></canvas>`;
      },
    };
    root.innerHTML = build(S);
    const els = fns.map((_, n) => root.querySelector(`[data-r="${n}"]`));
    return (t) => fns.forEach((fn, n) => fn(els[n], t));
  }

  // WebGL aurora: three layers of domain-warped noise shaped into curtains. Drawn at half size and
  // stretched; the softness is the point. The time uniform is the film clock.
  const FRAG = `
precision highp float;
uniform float uT; uniform float uI; uniform float uH; uniform vec2 uR;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),u.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*n(p); p=p*2.03+vec2(1.7,9.2); a*=.5; } return v; }
float curtain(vec2 uv, float off, float speed){
  vec2 q = vec2(uv.x*2.2 + off, uT*speed);
  float w = fbm(q + fbm(q*1.4 + uT*.05));
  float x = uv.x*6. + w*3.5 + off;
  float folds = .5 + .5*sin(x + uT*.35);
  float band = smoothstep(uH+.32, uH-.05, uv.y + w*.18) * smoothstep(uH-.62, uH-.12, uv.y + w*.25);
  return pow(folds, 3.) * band;
}
void main(){
  vec2 uv = gl_FragCoord.xy / uR; uv.y = 1. - uv.y;
  vec3 col = uC0;
  col += uC1 * curtain(uv, 0., .06) * 1.1 * uI;
  col += uC2 * curtain(uv, 3.1, .045) * .96 * uI;
  col += uC3 * pow(curtain(uv, 7.4, .08) * .55, 1.6) * .9 * uI;
  gl_FragColor = vec4(col + (h(gl_FragCoord.xy) - .5) * .02, 1.); // still grain: grain that moves doubles the file
}`;
  function aurora(canvas, horizon, colors) {
    // preserveDrawingBuffer: the builder's screenshot must find the frame still in the canvas.
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false });
    const fail = (why) => { errors.push(why); throw new Error(why); };
    if (!gl) fail('WebGL is unavailable: the aurora cannot draw');
    const shader = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) fail(`the aurora shader did not compile: ${gl.getShaderInfoLog(s)}`);
      return s;
    };
    const program = gl.createProgram();
    gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }'));
    gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) fail('the aurora shader did not link');
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.useProgram(program);
    const u = (name) => gl.getUniformLocation(program, name);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform1f(u('uH'), horizon);
    gl.uniform2f(u('uR'), gl.drawingBufferWidth, gl.drawingBufferHeight);
    colors.forEach((hex, i) => {
      const v = parseInt(hex.slice(1), 16);
      gl.uniform3f(u(`uC${i}`), ((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255);
    });
    const uT = u('uT'), uI = u('uI');
    return (t, intensity) => {
      gl.uniform1f(uT, t);
      gl.uniform1f(uI, intensity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
  }

  // Confetti solved in closed form per piece, so any frame can be drawn alone:
  // position = origin + velocity with drag + gravity, spin and flutter from the time since the burst.
  function confetti(ctx, t, bursts, count, seed, palette) {
    ctx.clearRect(0, 0, W, H);
    bursts.forEach((at, bi) => {
      const tau = t - at;
      if (tau < 0 || tau > 4) return;
      const rnd = seeded(seed + bi * 101);
      for (let i = 0; i < count; i++) {
        const left = i % 2 === 0;
        const angle = -(Math.PI / 2) + (left ? 1 : -1) * (0.18 + rnd() * 0.5);
        const speed = 1500 + rnd() * 1300;
        const drag = 1.6 + rnd() * 0.8;
        const k = (1 - Math.exp(-drag * tau)) / drag;
        const flutter = Math.sin(tau * (6 + rnd() * 6) + i) * 26 * Math.min(1, tau);
        const x = (left ? 160 : W - 160) + Math.cos(angle) * speed * k + flutter;
        const y = H + 40 + Math.sin(angle) * speed * k + 0.5 * 900 * tau * tau * 0.55;
        const spin = tau * (4 + rnd() * 8) + rnd() * 6;
        const round = rnd() < 0.35;
        const size = 16 + rnd() * 22;
        ctx.save();
        ctx.globalAlpha = Math.max(0, tau > 3 ? 1 - (tau - 3) : 1);
        ctx.translate(x, y);
        ctx.rotate(spin);
        ctx.scale(1, Math.cos(spin * 1.7));
        ctx.fillStyle = palette[Math.floor(rnd() * palette.length)];
        if (round) { ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, Math.PI * 2); ctx.fill(); } else ctx.fillRect(-size, -5, size * 2, 10);
        ctx.restore();
      }
    });
  }

  // ── The film ─────────────────────────────────────────────────────────────────────────────────
  const frame = document.body.appendChild(document.createElement('div'));
  frame.id = 'frame';
  frame.innerHTML = '<div id="stage"></div><div id="captions" hidden><span></span></div>';
  const stage = frame.firstChild;
  const captionBox = frame.lastChild;
  const scenes = [];
  let started = false;

  function add(id, build, { start, length, before = 0, after = 0, layer = 0 }) {
    if (started) throw new Error('Film.scene and Film.overlay are called before Film.start()');
    const el = stage.appendChild(document.createElement('section'));
    el.className = 'scene';
    el.id = id;
    el.style.zIndex = layer;
    scenes.push({ id, el, start, length, from: start - before, to: start + length + after, update: makeScene(el, build, start, length) });
  }

  /** Draws film time T, in seconds. The whole picture depends on T alone. */
  function seek(T) {
    T = clamp(T, 0, DURATION);
    for (const s of scenes) {
      // The last frame of the film still belongs to the last scene.
      const on = T >= s.from && (T < s.to || s.to >= DURATION);
      s.el.style.display = on ? 'block' : 'none';
      if (on) s.update(T - s.start);
    }
    const said = TIMING.captions.find((c) => T >= c.start && T < c.end);
    captionBox.firstChild.textContent = said ? said.text : '';
    captionBox.firstChild.style.display = said ? '' : 'none';
  }

  const Film = window.Film = {
    W, H, BEAT, BAR, duration: DURATION, timing: TIMING, errors,
    clamp, lerp, prog, ease, enter, exit, pulse, seeded, esc, token, phone, tablet, browser,
    /** Film time at which a scene starts: Film.at('sizes'). */
    at(id) {
      const s = TIMING.scenes.find((x) => x.id === id);
      if (!s) throw new Error(`narration.json has no scene "${id}"`);
      return s.start;
    },
    /**
     * A scene of narration.json, by id: its start and length come from the grid. build(S) returns
     * its markup. `before` and `after` (seconds) keep it on screen beyond its window, for a
     * transition that shows two scenes at once; a later scene is drawn over an earlier one.
     */
    scene(id, build, { before = 0, after = 0 } = {}) {
      const s = TIMING.scenes.find((x) => x.id === id);
      if (!s) throw new Error(`narration.json has no scene "${id}"`);
      add(id, build, { start: s.start, length: s.length, before, after, layer: TIMING.scenes.indexOf(s) + 1 });
    },
    /** A layer over every scene for the whole film (a wipe between acts, a logo bug): its S runs on film time. */
    overlay(build) {
      add(`overlay-${scenes.length}`, build, { start: 0, length: DURATION, layer: 1000 });
    },
    /** Waits for the fonts and every picture, draws the first frame, and plays or waits for the builder. */
    start() {
      started = true;
      const missing = TIMING.scenes.filter((s) => !scenes.some((x) => x.id === s.id)).map((s) => s.id);
      if (missing.length) errors.push(`film.js draws no scene for: ${missing.join(', ')}`);
      const faces = ['900 80px Nunito', '600 30px Inter', '560 80px Rubik'];
      window.filmReady = Promise.all([
        // Resolves with the faces it loaded: none means the family is not declared, and the film
        // would be drawn in a fallback face.
        ...faces.map((face) => document.fonts.load(face).then(
          (loaded) => { if (!loaded.length) errors.push(`font not declared: ${face} (is tokens.css linked?)`); },
          () => errors.push(`font failed to load: ${face}`))),
        ...[...stage.querySelectorAll('img')].map((img) => img.decode().catch(() => errors.push(`picture failed to load: ${img.getAttribute('src')}`))),
      ]).then(() => document.fonts.ready).then(() => {
        // Every scene is drawn once now, so a missing token or WebGL context stops the build here.
        try { for (const s of scenes) s.update(0); seek(0); } catch (e) { errors.push(String(e.message ?? e)); }
        if (errors.length && !RENDER) document.body.insertAdjacentHTML('beforeend', `<pre id="errors">${esc(errors.join('\n'))}</pre>`);
      });
      play();
    },
  };
  window.seek = seek;
  window.filmDuration = DURATION;
  window.filmErrors = errors;

  // ── Playing it for a person ──────────────────────────────────────────────────────────────────
  function play() {
    const fit = () => {
      const k = RENDER ? 1 : Math.min(innerWidth / W, innerHeight / H);
      frame.style.transform = `translate(${(innerWidth - W * k) / 2}px, ${(innerHeight - H * k) / 2}px) scale(${k})`;
    };
    addEventListener('resize', fit);
    fit();
    captionBox.hidden = query.get('captions') !== '1'; // no captions unless asked (the build's --captions, or the C key)
    if (RENDER) return;

    // Space plays and pauses, C shows captions, the arrows step a beat, ?t=12.5 opens on that time.
    const audio = new Audio(TIMING.audio);
    let failed = false, clockStart = null, held = +query.get('t') || 0;
    audio.addEventListener('error', () => { failed = true; }); // no MP3 yet: play against the wall clock
    const now = () => (failed ? (clockStart === null ? held : held + (performance.now() - clockStart) / 1000) : audio.currentTime || held);
    const playing = () => (failed ? clockStart !== null : !audio.paused);
    const hint = document.body.appendChild(document.createElement('button'));
    hint.id = 'play';
    hint.textContent = 'Play';
    const toggle = () => {
      if (failed) { held = now() >= DURATION ? 0 : now(); clockStart = clockStart === null ? performance.now() : null; }
      else if (audio.paused) { audio.currentTime = audio.ended ? 0 : now(); audio.play(); } else { held = audio.currentTime; audio.pause(); }
      hint.hidden = playing();
    };
    const step = (by) => { held = clamp(now() + by, 0, DURATION); if (failed) { if (clockStart !== null) clockStart = performance.now(); } else audio.currentTime = held; };
    hint.addEventListener('click', toggle);
    addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      if (e.key === 'c') captionBox.hidden = !captionBox.hidden;
      if (e.key === 'ArrowRight') step(BEAT);
      if (e.key === 'ArrowLeft') step(-BEAT);
    });
    const loop = () => { seek(now()); requestAnimationFrame(loop); };
    window.filmReady.then(loop);
  }
})();
