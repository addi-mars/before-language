/* Before Language — 01: Perception
 *
 * A 2.5D layered canvas renderer about depersonalization: seeing from inside
 * yourself versus watching yourself from outside.
 *
 * Every painted layer from Perception.psd is drawn as its own plane. One camera
 * value `c` (distance travelled forward) drives the journey:
 *
 *   c = 0      1stPOV, exactly the PSD composition
 *   c ≈ 1.6    the mirror opening fills the frame; reflection lets go
 *   c ≈ 2.0    glass has dissolved; the archway stands ahead, the room beyond
 *   c = 2.88   through the doorway; 3rdPOV, exactly the PSD composition
 *
 * Two signals come from the viewer (webcam head tracking, else mouse/touch):
 *   view  where you are looking from: moves the camera (parallax)
 *   self  the body's response to you: a delayed, sometimes absent copy of
 *         your movement. It drives the reflection, and in 3rdPOV the figure.
 *
 * Detachment, all quiet:
 *   - the reflection follows a fraction late, and now and then not at all
 *   - a hand sometimes adjusts itself while you are still
 *   - in 3rdPOV your movement stops moving the view and moves the figure
 *     instead, while the room slowly loses its depth and becomes flat
 *   - coming back, the glass is empty for a moment, the reflection arrives
 *     late, and depth returns slightly less than before
 *
 * Add ?debug (or press D) for layer bounds, z-order, mask, camera and state.
 */
(() => {
  'use strict';

  const MAN = window.PERCEPTION_MANIFEST;
  if (!MAN) { console.error('assets/manifest.js missing'); return; }
  const A = MAN.assets;
  const VIDEOS = window.PERCEPTION_VIDEOS || {};
  const W = 1920, H = 1080, CX = W / 2, CY = H / 2;
  const qs = new URLSearchParams(location.search);
  const num = (v, d) => (v !== null && v !== '' && isFinite(+v) ? +v : d);
  // test mode: the way through the mirror is open from the start and the
  // opening invitation is skipped, so you can click straight in
  const TEST = qs.has('test') || qs.has('debug');

  // ------------------------------------------------------------------ config
  const CFG = {
    overscan: 1.04,                    // 2% crop per side: room for parallax, the art has no bleed
    duration: num(qs.get('duration'), 11), // seconds for a full crossing
    // Scene A (1stPOV)
    focalA: { x: 920, y: 420 },        // where the camera aims while approaching the mirror
    mirrorD: 3.0,                      // wall, frame, glass, reflection
    tableTop: 763,                     // table edge row; it sits on the mirror plane
    tableNearD: 1.15,                  // depth of the bottom row of the table
    handRow: 940,                      // hands take the table's depth at this row
    // Archway (Scene 2)
    arch: { R: 2.0, at: 1.65, focal: { x: 960, y: 600 } },   // scale 1 at c = at
    // Scene B (3rdPOV), at rest when c = cEnd
    cEnd: 2.88,
    B: { focal: { x: 960, y: 470 }, room: 1.94, table: 1.85, figure: 1.75 },
    // colours sampled from the art
    backing: 'rgb(129,136,157)',       // behind the translucent mirror glass (matches the PSD preview)
    fill: 'rgb(33,29,35)',             // darkness beyond the painted room edges
    // pointer parallax: px of travel at full deflection, per plane
    pan: { wall: 12, refl: 5, arch: 20, room: 8, tableB: 16, figure: 22 },
    panV: 0.55,
    // detachment
    self: {
      lagA: 0.16,                      // s the reflection trails you by
      lagB: 0.45,                      // s the 3rdPOV figure trails you by
      firstFreeze: [21, 27],           // s before the reflection first fails to follow
      freezeEvery: [25, 45],           // s between lapses at low detachment (gets shorter as it grows)
      freezeLength: [1.4, 2.6],        // s each lapse lasts
      twitchEvery: [20, 45],           // s between a hand adjusting on its own (only while you're still)
      reflLean: 2.5,                   // px the reflection leans with you
      figureLean: 5,                   // px the 3rdPOV figure's head/shoulders lean with you
      flattenTime: 22,                 // s in 3rdPOV until the room is completely flat
      residuePerVisit: 0.35,           // how much depth does not come back after a crossing
      residueHalfLife: 40,             // s for that to fade
      headSway: 1.0,                   // px the head tips side to side on its own
      reflNeckY: 487,                  // where the reflection's head pivots (canvas px)
      gazeX: 3.0, gazeY: 1.2,          // px the irises travel toward the viewer (the eye openings allow about this much)
      gazeLag: 0.3,                    // s the eyes trail you by
    },
    // webcam: lean in to move toward the mirror, lean back to return
    // webcam distance: leaning in a little pushes the camera into the scene
    // (dolly); leaning in further carries you through the mirror; back returns
    maxHeadSpeed: 1.4,                 // viewer units per second (the frame is 2 units wide)
    maxScrub: 4,                       // scroll (the mouse way in): at most this many times normal crossing speed
    scrollStep: 0.0011,                // progress per pixel of scroll (a wheel notch is ~100 px)
    lean: { forward: 0.22, back: -0.1, gain: 0.5, dolly: 0.9, dollyMax: 0.32 },
    // the far mirror (3rdPOV) back into yourself
    loop: { focal: { x: 988, y: 266 }, pushMax: 1.64, aFrom: 1.85 },
    // the arc: how detachment builds and how grounding undoes it (per second unless noted)
    arc: {
      faithful: 20,                    // s at the start when the reflection is simply you
      riseInside: 0.0045,              // creeping detachment while you sit with the mirror
      riseOutside: 0.02,               // while watching yourself from outside
      perLapse: 0.06,                  // each time the reflection fails to follow
      onReturn: 0.12,                  // carried back with you from outside
      groundDelay: 1.5,                // s of resting attention on your hands before it takes
      groundRate: 0.05,                // how fast grounding brings you back
      revealAfter: 30,                 // s: the way through appears now even if nothing was noticed
    },
    // canvas textures over the whole picture: three layers at once (weave,
    // paper, paint), each cycling through its own pool on its own rhythm,
    // dissolving between textures and drifting its own way. Overall strength
    // follows detachment, and swells while crossing.
    texture: {
      strength: [0.1, 0.5],            // from fully present to fully detached
      crossing: 0.6,                   // mid-crossing
      scale: 0.6,                      // tile size relative to the 1920 canvas
      layers: [
        { kind: 'weave', blend: 'soft-light', weight: 1.0, hold: 13, fade: 6, drift: 2.0 },
        { kind: 'paper', blend: 'overlay',    weight: 0.55, hold: 19, fade: 8, drift: 1.2 },
        { kind: 'paint', blend: 'soft-light', weight: 0.8, hold: 11, fade: 5, drift: 3.0 },
      ],
    },
  };

  // camera path: P (eased progress 0..1) -> c. Monotone, lingers at the threshold.
  const PATH = [[0, 0], [0.1, 0.12], [0.46, 1.6], [0.58, 1.86], [0.7, 2.1], [0.88, 2.72], [1, CFG.cEnd]];

  // ------------------------------------------------------------------ helpers
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = ([a, b]) => a + Math.random() * (b - a);
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const fadeOut = (c, a, b) => 1 - smooth(a, b, c);
  const easeInOut = (u) => -(Math.cos(Math.PI * u) - 1) / 2;
  const INK = (getComputedStyle(document.documentElement).getPropertyValue('--ink') || '#141217').trim();
  const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');

  function monotone(pts) {             // Fritsch–Carlson monotone cubic
    const n = pts.length, x = pts.map(p => p[0]), y = pts.map(p => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d[i] = (y[i + 1] - y[i]) / (x[i + 1] - x[i]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
      if (s > 9) { const t = 3 / Math.sqrt(s); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (v) => {
      v = clamp(v, x[0], x[n - 1]);
      let i = 0; while (i < n - 2 && v > x[i + 1]) i++;
      const h = x[i + 1] - x[i], t = (v - x[i]) / h, t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * y[i] + (t3 - 2 * t2 + t) * h * m[i] +
             (-2 * t3 + 3 * t2) * y[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  const camFromP = monotone(PATH);

  // table depth by row: a ground plane, so 1/D is linear in screen row
  const invTop = 1 / CFG.mirrorD, invNear = 1 / CFG.tableNearD;
  const tableD = (y) => 1 / (invTop + clamp((y - CFG.tableTop) / (H - CFG.tableTop)) * (invNear - invTop));
  const HAND_D = tableD(CFG.handRow);

  // ------------------------------------------------------------------ DOM
  const canvas = document.getElementById('view');
  const ctx = canvas.getContext('2d');
  const btn = document.getElementById('cross');
  const camBtn = document.getElementById('camera');
  const statusEl = document.getElementById('status');
  const opening = document.getElementById('opening');
  const controls = document.querySelector('.controls');
  const dbgEl = document.getElementById('debug');

  const bufA = document.createElement('canvas');      // reduced-motion crossfade buffer
  const bctx = bufA.getContext('2d');
  const MM = A['scene-a/mirror-mask'];                 // mirror interior is composed here
  const mirrorCanvas = document.createElement('canvas');
  mirrorCanvas.width = MM.w; mirrorCanvas.height = MM.h;
  const mctx = mirrorCanvas.getContext('2d');

  // ------------------------------------------------------------------ state
  const S = {
    u: 0, uTarget: 0, auto: false, goal: 0,
    pointer: { x: 0, y: 0 },           // mouse/touch, -1..1
    head: { x: 0, y: 0 },              // the viewer, smoothed (camera or pointer)
    pan: { x: 0, y: 0 },               // what the camera actually does
    self: { x: 0, y: 0 },              // the body's delayed response to the viewer
    history: [], headSpeed: 0, stillFor: 0, headSrc: 'pointer', lean: 0, dolly: 0,
    gaze: { x: 0, y: 0 },
    freezeUntil: 0, hold: null, recover: 0, nextFreeze: rand(CFG.self.firstFreeze),
    twitch: null, nextTwitch: rand(CFG.self.twitchEvery),
    detach: 0, grounding: 0, groundHold: 0, overHands: false, noticed: false, noticedAt: 0,
    flat: 0, residue: 0, visitedB: false, cameBack: false, returnAt: -1, reflArrive: 1,
    t: 0, last: 0, debug: qs.has('debug'), reduced: reducedMQ.matches || qs.has('reduced'),
    ready: false, state: '', fps: 60, boxes: [],
    begun: false, beginT: 0, entry: 1, lastActivity: 0,
  };
  reducedMQ.addEventListener?.('change', (e) => { S.reduced = e.matches || qs.has('reduced'); });

  // ------------------------------------------------------------------ images + After Effects video layers
  const IMG = {}, VID = {};
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);

  function loadImages(onProgress) {
    const all = Object.entries(A);
    let done = 0;
    return Promise.all(all.map(([key, a]) => new Promise((res, rej) => {
      const im = new Image();
      im.decoding = 'async';
      im.onload = () => { im.decode?.().catch(() => {}); onProgress?.(++done / all.length); res(); };   // don't wait on decode (it stalls in background tabs)
      im.onerror = () => rej(new Error('failed to load ' + a.src));
      im.src = a.src;
      IMG[key] = im;
    })));
  }

  /* A layer listed in assets/videos.js plays a looping transparent video
   * (rendered from After Effects) in place of its still image. It keeps the
   * same position, depth, parallax and masking. Safari needs HEVC-with-alpha
   * (.mov), every other browser VP9-with-alpha (.webm). If a video is missing
   * or can't play, the still image is used and nothing breaks. */
  // Not awaited: the stills show immediately and each video takes over its
  // layer as soon as it has a frame (SRC checks readiness every frame).
  function loadVideos() {
    for (const [key, opt] of Object.entries(VIDEOS)) {
      if (!A[key]) { console.warn('videos.js: no layer called', key); continue; }
      const o = opt === true ? {} : opt;
      const src = isSafari ? (o.hevc || `assets/video/${key}.mov`) : (o.webm || `assets/video/${key}.webm`);
      const v = Object.assign(document.createElement('video'), {
        muted: true, loop: o.loop !== false, playsInline: true, autoplay: true, preload: 'auto', src,
      });
      v.setAttribute('playsinline', '');
      VID[key] = { el: v, puppet: o.puppet !== false };
      v.addEventListener('error', () => {
        console.warn(`video layer ${key}: could not play ${src}; using the still image`);
        delete VID[key];
      }, { once: true });
      v.load();
      v.play().catch(() => {});
    }
  }
  /* What to draw for a layer right now: its video frame if it has one, else
   * the still. A video is captured ONCE per screen refresh into a canvas and
   * every draw that frame uses that capture. Layers drawn in many slices (the
   * puppet warp) would otherwise pull different video frames for different
   * slices of the same picture, which tears. */
  let frameNo = 0;
  function SRC(key) {
    const v = VID[key];
    if (!v || v.el.readyState < 2 || !v.el.videoWidth) return IMG[key];
    if (!v.cap) {
      v.cap = document.createElement('canvas');
      v.cap.width = v.el.videoWidth; v.cap.height = v.el.videoHeight;
      v.capG = v.cap.getContext('2d');
    }
    if (v.capFrame !== frameNo) {
      v.capG.clearRect(0, 0, v.cap.width, v.cap.height);
      v.capG.drawImage(v.el, 0, 0);
      v.capFrame = frameNo;
    }
    return v.cap;
  }
  // a video's real size can differ by a pixel (HEVC rounds to even), so map by ratio
  const srcScale = (key, src) => src.height / A[key].h;
  const srcW = (key, src) => src.width;
  const puppetOn = (key) => !VID[key] || VID[key].puppet;

  /* Keep all video layers of the same length on one clock. Layers animated
   * together in AE (e.g. reflection + its glaze, the two hands) must stay in
   * step. Small drift is corrected by nudging playback speed a few percent,
   * which is invisible; a jump (seek) only happens if they're more than half a
   * second apart, e.g. after the tab was in the background. Seeking every
   * small drift made the videos hiccup constantly. */
  let lastSync = 0;
  function syncVideos(now) {
    if (now - lastSync < 250) return;
    lastSync = now;
    const vids = Object.values(VID).map(v => v.el).filter(v => v.readyState >= 2 && v.duration);
    if (vids.length < 2) return;
    const leader = vids[0];
    for (const v of vids.slice(1)) {
      if (Math.abs(v.duration - leader.duration) > 0.05) continue;     // different loop lengths drift freely
      let d = v.currentTime - leader.currentTime;                    // + means v is ahead
      if (d > v.duration / 2) d -= v.duration;                        // across the loop point
      if (d < -v.duration / 2) d += v.duration;
      if (Math.abs(d) > 0.5) { v.currentTime = leader.currentTime; v.playbackRate = 1; }
      else v.playbackRate = Math.abs(d) < 0.01 ? 1 : clamp(1 - d * 1.5, 0.92, 1.08);
      if (v.paused && !leader.paused) v.play().catch(() => {});
    }
  }

  // ------------------------------------------------------------------ view transform
  // placed (1920×1080 art coords, after camera) -> device pixels: dev = B + K * placed
  const V = { K: 1, bx: 0, by: 0, fit: 1, ox: 0, oy: 0, cw: 0, ch: 0 };
  function resize() {
    const cssW = canvas.clientWidth, cssH = canvas.clientHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fitCss = Math.min(cssW / W, cssH / H);
    if (W * fitCss * dpr > 2880) dpr = 2880 / (W * fitCss);   // keep fill-rate sane on huge screens
    canvas.width = bufA.width = Math.round(cssW * dpr);
    canvas.height = bufA.height = Math.round(cssH * dpr);
    V.cw = canvas.width; V.ch = canvas.height;
    // Fit the 16:9 picture. On landscape screens, crop a little (at most ~6%
    // a side) rather than leave dark bands; on portrait screens show it whole.
    const contain = Math.min(V.cw / W, V.ch / H), cover = Math.max(V.cw / W, V.ch / H);
    V.fit = V.cw >= V.ch ? Math.min(cover, contain * 1.12) : contain;
    V.ox = (V.cw - W * V.fit) / 2; V.oy = (V.ch - H * V.fit) / 2;
    const o = CFG.overscan;
    V.K = V.fit * o;
    V.bx = V.ox + V.fit * (CX - o * CX);
    V.by = V.oy + V.fit * (CY - o * CY);
  }
  const setBase = (g) => g.setTransform(V.K, 0, 0, V.K, V.bx, V.by);

  // where a layer lands: perspective scale about the focal point, plus camera parallax
  function place(a, f, s, k) {
    const ox = -S.pan.x * k * s, oy = -S.pan.y * k * CFG.panV * s;
    return { x: f.x + (a.x - f.x) * s + ox, y: f.y + (a.y - f.y) * s + oy, w: a.w * s, h: a.h * s, s, ox, oy };
  }

  function note(name, r, z) { if (S.debug) S.boxes.push({ name, z, x: r.x, y: r.y, w: r.w, h: r.h }); }

  function draw(g, key, f, s, k, alpha = 1, z = 0) {
    if (alpha <= 0.001) return;
    const a = A[key], r = place(a, f, s, k);
    g.globalAlpha = alpha;
    g.drawImage(SRC(key), r.x, r.y, r.w, r.h);
    note(key + (VID[key] ? ' [video]' : ''), r, z);
  }

  /* Puppet warp: draws a layer in horizontal slices that bend about a pivot
   * row. Rows above the pivot lift (breath) and lean (sway) progressively, like
   * a body moving from the seat or waist. Slice edges are snapped to device
   * pixels so no seams appear. `g` must have the identity transform. */
  function drawWarp(g, key, rect, pivotY, lift, sway, alpha, map, opt = {}) {
    if (alpha <= 0.001) return;
    const a = A[key], src = opt.src || SRC(key), sc = opt.src ? 1 : srcScale(key, src);
    const head = opt.head;
    if (!puppetOn(key)) { lift = 0; sway = 0; }
    const N = Math.max(8, Math.round(a.h / 12));
    const top = a.y;
    const disp = (y) => {
      const h = clamp((pivotY - y) / (pivotY - top));
      let dx = sway * h * h;
      // head: a shear above the neck only, so it tips side to side while the
      // shoulders stay planted (eased in just above the neck, no kink)
      if (head && head.dx) dx += head.dx * Math.pow(clamp((head.neckY - y) / (head.neckY - head.top)), 1.3);
      return { dy: -lift * h, dx };
    };
    g.globalAlpha = alpha;
    let prevDev = null;
    for (let i = 0; i < N; i++) {
      const sy0 = Math.round(a.h * i / N), sy1 = Math.round(a.h * (i + 1) / N);
      const y0 = a.y + sy0, y1 = a.y + sy1;
      const d0 = disp(y0), d1 = disp(y1);
      const dx = (d0.dx + d1.dx) / 2;
      const Y0 = prevDev ?? Math.round(map.y(rect.y + (sy0 + d0.dy) * rect.s));
      const Y1 = Math.round(map.y(rect.y + (sy1 + d1.dy) * rect.s));
      prevDev = Y1;
      if (Y1 <= Y0) continue;
      const X0 = map.x(rect.x + dx * rect.s), X1 = map.x(rect.x + (a.w + dx) * rect.s);
      g.drawImage(src, 0, sy0 * sc, opt.src ? a.w : srcW(key, src), (sy1 - sy0) * sc, X0, Y0, X1 - X0, Y1 - Y0);
    }
  }
  const devMap = { x: (x) => V.bx + V.K * x, y: (y) => V.by + V.K * y };
  const idMap = { x: (x) => x, y: (y) => y };

  /* The reflection's eyes follow the viewer. Each iris (with its pupil) was
   * cut from your painting into its own small sprite, and the space behind it
   * filled with eye-white (tools/cut_eyes.py). Here the face is drawn without
   * irises, then each iris is drawn back clipped to the eye opening, which
   * sits just inside the lids, and shifted toward the viewer. So the lids and
   * lashes stay put over a moving eye. Done identically for the reflection
   * and its 40% glaze copy so the two never separate. If the eye files are
   * missing, the face is drawn as painted and the eyes simply don't move. */
  const EYEDATA = window.PERCEPTION_EYES;
  const EYEIMG = {};
  if (EYEDATA) {
    for (const base of ['reflection', 'glaze']) {
      EYEIMG[base] = { eyeless: Object.assign(new Image(), { src: `assets/eyes/${base}-eyeless.webp` }) };
      for (const n of Object.keys(EYEDATA.eyes)) EYEIMG[base][n] = Object.assign(new Image(), { src: `assets/eyes/${base}-iris-${n}.png` });
    }
  }
  const imgReady = (im) => im && im.complete && im.naturalWidth > 0;
  const makeBuf = (key) => {
    const c = document.createElement('canvas'); c.width = A[key].w; c.height = A[key].h;
    return { c, g: c.getContext('2d') };
  };
  const reflBuf = makeBuf('scene-a/reflection'), glazeBuf = makeBuf('scene-a/reflection-glaze');
  function withEyes(key, buf, gx, gy) {
    const a = A[key], g = buf.g, base = key.endsWith('glaze') ? 'glaze' : 'reflection';
    const set = EYEIMG[base];
    g.clearRect(0, 0, a.w, a.h);
    const canMove = EYEDATA && set && imgReady(set.eyeless) && !VID[key];
    if (!canMove) { g.drawImage(SRC(key), 0, 0, a.w, a.h); return buf.c; }
    g.drawImage(set.eyeless, 0, 0, a.w, a.h);
    for (const [n, e] of Object.entries(EYEDATA.eyes)) {
      const im = set[n], m = EYEDATA[base][n];
      if (!imgReady(im)) continue;
      g.save();
      g.beginPath();
      g.ellipse(e.open[0], e.open[1], e.rx, e.ry, 0, 0, Math.PI * 2);
      g.clip();
      g.drawImage(im, m.x + gx, m.y + gy);
      g.restore();
    }
    return buf.c;
  }

  // after a crossing, Scene A's depth comes back a little flatter
  const kA = (k) => lerp(k, CFG.pan.wall, Math.max(S.residue, S.detach * 0.5));
  // in 3rdPOV, the room gradually stops having depth at all
  const kB = (k) => lerp(k, CFG.pan.room, S.flat);

  // ------------------------------------------------------------------ Scene A
  function composeMirror(aGlass, aRefl, t, live) {
    const g = mctx, mx = MM.x, my = MM.y;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.clearRect(0, 0, MM.w, MM.h);
    const at = (key, dx = 0, dy = 0) => { const a = A[key]; return { x: a.x - mx + dx, y: a.y - my + dy, s: 1 }; };

    // The frame moves with the camera (your view). The reflection moves with
    // `self`: normally that's you a moment ago, so it shifts against the frame
    // like a real reflection; when self lapses, it simply stays where it was.
    const kRefl = lerp(CFG.pan.refl, CFG.pan.wall, S.residue);
    const rx = S.pan.x * CFG.pan.wall - S.self.x * kRefl;
    const ry = (S.pan.y * CFG.pan.wall - S.self.y * kRefl) * CFG.panV;
    const breath = live ? 0.55 * Math.sin(t * 2 * Math.PI / 5.2) : 0;
    const sway = live ? 0.45 * Math.sin(t * 2 * Math.PI / 9.5 + 0.7) : 0;
    const lean = live ? S.self.x * CFG.self.reflLean : 0;
    const dip = live ? -S.self.y * 1.2 : 0;
    const drift = live ? { x: 4 * Math.sin(t * 0.05), y: 2.5 * Math.sin(t * 0.037 + 1) } : { x: 0, y: 0 };

    g.globalAlpha = aGlass;
    g.fillStyle = CFG.backing;
    g.fillRect(0, 0, MM.w, MM.h);
    const plain = (key, alpha, dx = 0, dy = 0) => {
      if (alpha <= 0.001) return;
      const r = at(key, dx, dy), a = A[key];
      g.globalAlpha = alpha; g.drawImage(SRC(key), r.x, r.y, a.w, a.h);
    };
    // the head tips slowly side to side, and toward the side you lean
    const head = { neckY: CFG.self.reflNeckY, top: 142, dx: live ? CFG.self.headSway * Math.sin(t * 2 * Math.PI / 7.3) + S.self.x * 1.2 : 0 };
    // the eyes look toward you (even while the body fails to follow)
    const gx = live ? S.gaze.x * CFG.self.gazeX : 0, gy = live ? S.gaze.y * CFG.self.gazeY : 0;
    const showRefl = aRefl > 0.001;

    plain('scene-a/glass-base', aGlass);
    if (showRefl) drawWarp(g, 'scene-a/reflection', at('scene-a/reflection', rx, ry), 860, 1.8 * breath + dip, 1.4 * sway + lean, aRefl, idMap,
      { head, src: withEyes('scene-a/reflection', reflBuf, gx, gy) });
    plain('scene-a/glass-haze', aGlass);
    g.globalCompositeOperation = 'screen';
    plain('scene-a/glass-clouds', aGlass, drift.x, drift.y);
    g.globalCompositeOperation = 'source-over';
    if (showRefl) drawWarp(g, 'scene-a/reflection-glaze', at('scene-a/reflection-glaze', rx, ry), 860, 1.8 * breath + dip, 1.4 * sway + lean, aRefl, idMap,
      { head, src: withEyes('scene-a/reflection-glaze', glazeBuf, gx, gy) });
    plain('scene-a/glass-scratches', aGlass);
    // keep everything inside the mirror opening
    g.globalCompositeOperation = 'destination-in';
    g.globalAlpha = 1;
    g.drawImage(IMG['scene-a/mirror-mask'], 0, 0);
    g.globalCompositeOperation = 'source-over';
  }

  function handTwitch(i, t) {
    const tw = S.twitch;
    if (!tw || tw.hand !== i) return 0;
    const tau = t - tw.start;                  // a small adjustment, held, then let go
    return tw.sign * (tau < 0.3 ? smooth(0, 0.3, tau) : 1 - smooth(0.9, 2.6, tau));
  }

  function drawSceneA(g, c, t, live, fromGlass = false) {
    const f = CFG.focalA, D = CFG.mirrorD;
    const sM = D / (D - c);
    // coming out of the glass (the loop), the glass is whole from the start
    const aWall = fadeOut(c, 1.6, 1.75), aGlass = fromGlass ? 1 : fadeOut(c, 1.65, 2.05);
    const aRefl = fadeOut(c, 1.3, 1.75) * S.reflArrive;
    const aTable = fadeOut(c, 1.2, 1.6), aHands = fadeOut(c, 0.6, 1.0);
    const kW = CFG.pan.wall;

    setBase(g);
    draw(g, 'scene-a/wall', f, sM, kW, aWall, 1);

    if (aGlass > 0.001) {
      composeMirror(aGlass, aRefl, t, live);
      const r = place(MM, f, sM, kW);
      g.globalAlpha = 1;
      g.drawImage(mirrorCanvas, r.x, r.y, r.w, r.h);
      note('mirror interior (masked)', r, 2);
    }
    draw(g, 'scene-a/mirror-frame', f, sM, kW, aWall, 3);

    // table: a receding ground plane, drawn as strips each at its own depth.
    // Its far edge sits on the mirror plane, so it never parts from the frame.
    if (aTable > 0.001) {
      const a = A['scene-a/table'], img = SRC('scene-a/table'), sc = srcScale('scene-a/table', img);
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = aTable;
      const step = 8;
      let prev = null;
      for (let sy = 0; sy < a.h; sy += step) {
        const y0 = a.y + sy, y1 = Math.min(a.y + a.h, y0 + step), sh = y1 - y0;
        const D0 = tableD(y0), D1 = tableD(y1), Dm = tableD((y0 + y1) / 2);
        if (D1 - c < 0.08) break;               // this row and everything nearer is behind us
        const s0 = D0 / (D0 - c), s1 = D1 / (D1 - c), sm = Dm / (Dm - c);
        const k0 = kA(kW * D / D0), k1 = kA(kW * D / D1), km = kA(kW * D / Dm);
        const Y0 = prev ?? Math.round(devMap.y(f.y + (y0 - f.y) * s0 - S.pan.y * k0 * CFG.panV * s0));
        const Y1 = Math.round(devMap.y(f.y + (y1 - f.y) * s1 - S.pan.y * k1 * CFG.panV * s1));
        prev = Y1;
        if (Y0 >= V.ch) break;
        if (Y1 <= Y0) continue;
        const X0 = devMap.x(f.x + (a.x - f.x) * sm - S.pan.x * km * sm);
        g.drawImage(img, 0, sy * sc, srcW('scene-a/table', img), sh * sc, X0, Y0, a.w * sm * V.K, Y1 - Y0);
      }
      if (S.debug) note('scene-a/table (ground-plane strips)', place(a, f, 1, 0), 4);
      setBase(g);
    }

    // hands: yours, resting on the table. Each rocks slightly from the wrist,
    // and now and then one adjusts itself while you are perfectly still.
    if (aHands > 0.001 && HAND_D - c > 0.1) {
      const sH = HAND_D / (HAND_D - c), kH = kA(kW * D / HAND_D);
      const hands = [
        ['scene-a/hand-left', { x: 330, y: 1080 }, 7.3, 0.0, -1],
        ['scene-a/hand-right', { x: 1560, y: 1080 }, 8.1, 2.1, 1],
      ];
      hands.forEach(([key, pivot, period, phase, side], i) => {
        const r = place(A[key], f, sH, kH);
        const p = { x: f.x + (pivot.x - f.x) * sH + r.ox, y: f.y + (pivot.y - f.y) * sH + r.oy };
        const w = live && puppetOn(key) ? Math.sin(t * 2 * Math.PI / period + phase) : 0;
        const tw = live ? handTwitch(i, t) : 0;
        const ang = side * 0.003 * w + 0.008 * tw;
        g.save();
        g.translate(p.x, p.y); g.rotate(ang); g.translate(-p.x, -p.y + (live ? -0.8 * w - 1.5 * Math.abs(tw) : 0));
        g.globalAlpha = aHands;
        const src = SRC(key);
        if (src !== IMG[key]) {
          // an animated (Puppet) hand can sag a few px off the bottom edge between
          // its anchor pins; the still's bottom rows underneath keep the wrist and
          // sleeve meeting the frame edge
          const a = A[key], rows = 14;
          g.drawImage(IMG[key], 0, a.h - rows, a.w, rows, r.x, r.y + r.h - rows * r.s, r.w, rows * r.s);
        }
        g.drawImage(src, r.x, r.y, r.w, r.h);
        g.restore();
        note(key + (VID[key] ? ' [video]' : ''), r, 5);
      });
    }
    g.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ Archway
  function drawArch(g, c) {
    const R = CFG.arch.R, s = R / (R + CFG.arch.at - c);
    if (s <= 0 || s > 30) return;
    const alpha = fadeOut(c, 2.72, 2.86);
    setBase(g);
    draw(g, 'archway/wall', CFG.arch.focal, s, CFG.pan.arch, alpha, 6);
    draw(g, 'archway/frame', CFG.arch.focal, s, CFG.pan.arch, alpha, 7);
  }

  // ------------------------------------------------------------------ Scene B
  function drawSceneB(g, c, t, live, pushExtra = 0) {
    const cE = CFG.cEnd;
    // beyond the rest view the camera pushes toward the far mirror, aimed at
    // its glass; up to the rest view it travels as before
    const push = Math.max(0, c - cE) + pushExtra;
    const cc = Math.min(c, cE);
    const f = push > 0 ? CFG.loop.focal : CFG.B.focal;
    const sc = (R) => (push > 0 ? R / (R - push) : R / (R + cE - cc));
    const aFig = fadeOut(push, 0.25, 0.85);   // you pass through yourself
    const aTab = fadeOut(push, 0.45, 0.95);
    const sRoom = sc(CFG.B.room), sTable = sc(CFG.B.table), sFig = sc(CFG.B.figure);
    setBase(g);
    draw(g, 'scene-b/room', f, sRoom, CFG.pan.room, 1, 8);
    draw(g, 'scene-b/floor-shadows', f, sRoom, CFG.pan.room, 1, 9);
    draw(g, 'scene-b/mirror', f, sRoom, CFG.pan.room, 1, 10);
    draw(g, 'scene-b/table', f, sTable, kB(CFG.pan.tableB), aTab, 11);
    draw(g, 'scene-b/chair', f, sFig, kB(CFG.pan.figure), aFig, 12);
    // The figure is you, seen from outside: it breathes from the seat, and it
    // leans when you lean, a little after you do. The chair stays still.
    const r = place(A['scene-b/figure'], f, sFig, kB(CFG.pan.figure));
    const near = smooth(2.3, cE, c);           // you only "operate" them once you're through
    const breath = live ? 0.55 * Math.sin(t * 2 * Math.PI / 5.6 + 1.3) : 0;
    const sway = live ? 0.4 * Math.sin(t * 2 * Math.PI / 11 + 0.4) : 0;
    const lean = live ? S.self.x * CFG.self.figureLean * near : 0;
    const dip = live ? -S.self.y * 1.2 * near : 0;
    g.setTransform(1, 0, 0, 1, 0, 0);
    // bends above the chair back only, so the chair's line art (in this layer) stays put
    const headB = { neckY: 262, top: 142, dx: live ? CFG.self.headSway * 1.1 * Math.sin(t * 2 * Math.PI / 8.3 + 1) + S.self.x * 1.8 * near : 0 };
    drawWarp(g, 'scene-b/figure', r, 380, 1.6 * breath + dip, 1.8 * sway + lean, aFig, devMap, { head: headB });
    note('scene-b/figure (puppet)' + (VID['scene-b/figure'] ? ' [video]' : ''), r, 13);
    setBase(g);

    // seen from far off through the doorway, the room plate is smaller than the
    // frame; its painted edges dissolve into the surrounding dark
    const edge = 1 - smooth(0.9, 1.0, sRoom);
    if (edge > 0.001) {
      const rr = place(A['scene-b/room'], f, sRoom, CFG.pan.room);
      const band = 160 * sRoom;
      g.globalAlpha = edge;
      const grad = (x0, y0, x1, y1) => {
        const gr = g.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, CFG.fill); gr.addColorStop(1, 'rgba(33,29,35,0)');
        return gr;
      };
      g.fillStyle = grad(rr.x, 0, rr.x + band, 0); g.fillRect(rr.x, rr.y, band, rr.h);
      g.fillStyle = grad(rr.x + rr.w, 0, rr.x + rr.w - band, 0); g.fillRect(rr.x + rr.w - band, rr.y, band, rr.h);
      g.fillStyle = grad(0, rr.y, 0, rr.y + band); g.fillRect(rr.x, rr.y, rr.w, band);
      g.fillStyle = grad(0, rr.y + rr.h, 0, rr.y + rr.h - band); g.fillRect(rr.x, rr.y + rr.h - band, rr.w, band);
      g.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------ textures
  const TEXLIST = window.PERCEPTION_TEXTURES || [];
  const TEX = TEXLIST.map(({ file, kind, mode }) => {
    const im = new Image(); im.src = `assets/texture/${file}.webp`; return { file, kind, mode: mode || 'repeat', im, pat: null };
  });
  /* The layers are composed into one half-resolution "texture field" about
   * ten times a second (they move slowly), and the field is laid over the
   * picture in a single soft-light pass per frame. Blending every layer over
   * the full picture every frame was far too slow. */
  const field = document.createElement('canvas');
  const fg = field.getContext('2d');
  let fieldAt = -1;
  function composeField() {
    const T = CFG.texture;
    const ready = TEX.filter(x => x.im.complete && x.im.naturalWidth);
    const fw = Math.max(2, Math.round(W * V.fit / 2)), fh = Math.max(2, Math.round(H * V.fit / 2));
    if (field.width !== fw || field.height !== fh) { field.width = fw; field.height = fh; TEX.forEach(x => { x.pat = null; }); }
    fg.setTransform(1, 0, 0, 1, 0, 0);
    fg.globalCompositeOperation = 'source-over';
    fg.globalAlpha = 1;
    fg.fillStyle = 'rgb(128,128,128)';                              // neutral: soft-light leaves the art alone here
    fg.fillRect(0, 0, fw, fh);
    const K2 = V.K / 2;
    T.layers.forEach((L, li) => {
      const pool = ready.filter(x => x.kind === L.kind);
      if (!pool.length) return;
      const cyc = L.hold + L.fade, n = pool.length;
      const k = S.reduced ? li : S.t / cyc + li * 0.37;            // layers out of step with each other
      const i = Math.floor(k) % n, frac = k - Math.floor(k);
      const m = S.reduced || n < 2 ? 0 : smooth(L.hold / cyc, 1, frac);
      [[pool[i], 1 - m, i], [pool[(i + 1) % n], m, i + 1]].forEach(([tx, w, j]) => {
        if (w <= 0.002) return;
        fg.globalAlpha = clamp(L.weight * w * 0.75);
        const ang = j * 2.1 + li * 1.3;                             // each texture moves its own way
        if (tx.mode === 'cover') {
          // laid once over the whole frame, a little oversized, swaying slowly
          // within that margin: no repeat, so no seam
          const side = Math.max(fw, fh) * 1.12, amp = (side - Math.max(fw, fh)) / 2 * 0.9;
          const ph = S.reduced ? 0 : S.t * 0.02 * L.drift;
          const dx = Math.cos(ph + ang) * amp, dy = Math.sin(ph * 0.8 + ang) * amp * 0.6;
          fg.drawImage(tx.im, (fw - side) / 2 + dx, (fh - side) / 2 + dy, side, side);
        } else {
          if (!tx.pat) tx.pat = fg.createPattern(tx.im, 'repeat');
          const sc = K2 * T.scale * (1920 / 1024) * 0.55 * (1 + 0.15 * li);
          const d = S.reduced ? 0 : S.t * L.drift * K2;
          tx.pat.setTransform(new DOMMatrix().translate(Math.cos(ang) * d, Math.sin(ang) * d).scale(sc));
          fg.fillStyle = tx.pat;
          fg.fillRect(0, 0, fw, fh);
        }
      });
    });
  }
  function drawTextures(g, c) {
    const T = CFG.texture;
    if (qs.has('notexture') || !TEX.length) return;
    const cross = S.loopSeg ? smooth(0.1, 0.4, S.loopQ) * (1 - smooth(0.55, 0.9, S.loopQ)) : smooth(1.1, 1.6, c) * (1 - smooth(2.2, 2.75, c));
    const strength = lerp(lerp(T.strength[0], T.strength[1], S.detach), T.crossing, cross);
    if (strength <= 0.002) return;
    if (fieldAt < 0 || S.t - fieldAt > 0.1 || field.width !== Math.max(2, Math.round(W * V.fit / 2))) { composeField(); fieldAt = S.t; }
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = clamp(strength * 1.5);
    g.drawImage(field, V.ox, V.oy, W * V.fit, H * V.fit);
    g.restore();
  }

  // where the picture meets dark bands, soften its edge into them
  function featherEdges(g) {
    const sw = W * V.fit, sh = H * V.fit, bands = [];
    if (V.ox > 1) bands.push(['l', V.ox, V.oy, sw * 0.025], ['r', V.ox + sw, V.oy, sw * 0.025]);
    if (V.oy > 1) bands.push(['t', V.ox, V.oy, sh * 0.03], ['b', V.ox, V.oy + sh, sh * 0.03]);
    if (!bands.length) return;
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    for (const [side, x, y, d] of bands) {
      const gr = side === 'l' ? g.createLinearGradient(x, 0, x + d, 0) : side === 'r' ? g.createLinearGradient(x, 0, x - d, 0)
        : side === 't' ? g.createLinearGradient(0, y, 0, y + d) : g.createLinearGradient(0, y, 0, y - d);
      gr.addColorStop(0, INK); gr.addColorStop(1, 'rgba(20,18,23,0)');
      g.fillStyle = gr;
      if (side === 'l') g.fillRect(x, y, d, sh); else if (side === 'r') g.fillRect(x - d, y, d, sh);
      else if (side === 't') g.fillRect(x, y, sw, d); else g.fillRect(x, y - d, sw, d);
    }
    g.restore();
  }

  // ------------------------------------------------------------------ frame
  function stateName(M, c) {
    if (M.distA <= 0.001) return 'inhabit';
    if (M.distB <= 0.001) return 'observe';
    if (M.seg === 1) return M.Pe < 0.5 ? 'into the far mirror' : 'emerging';
    if (c < 1.55) return 'approach';
    if (c < 2.06) return 'cross';
    if (c < 2.6) return 'threshold';
    return 'arrive';
  }

  function clipStage(g) {
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = INK;
    g.fillRect(0, 0, V.cw, V.ch);
    g.save();
    g.beginPath(); g.rect(V.ox, V.oy, W * V.fit, H * V.fit); g.clip();
    g.fillStyle = CFG.fill;
    g.fillRect(V.ox, V.oy, W * V.fit, H * V.fit);
  }

  function render(M, c) {
    S.boxes.length = 0;
    const live = !S.reduced;
    clipStage(ctx);
    if (S.reduced) {
      // no camera travel: a slow dissolve between the two rest compositions
      const P = M.distA;                      // 0 = 1stPOV, 1 = 3rdPOV, either half
      if (P > 0.001) { drawSceneB(ctx, CFG.cEnd, S.t, false); }
      if (P < 0.999) {
        bctx.setTransform(1, 0, 0, 1, 0, 0);
        bctx.clearRect(0, 0, V.cw, V.ch);
        drawSceneA(bctx, 0, S.t, false);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1 - P;
        ctx.drawImage(bufA, 0, 0);
        ctx.globalAlpha = 1;
      }
    } else if (M.seg === 0) {
      if (c > 1.55) { drawSceneB(ctx, c, S.t, live); drawArch(ctx, c); }
      if (c < 2.06) drawSceneA(ctx, c, S.t, live);
    } else {
      // into the far mirror, through your own figure; its glass gives way to
      // your mirror's glass, and you come back out of it into your seat
      if (M.xf < 1) drawSceneB(ctx, CFG.cEnd, S.t, live, M.push);
      if (M.xf > 0) {
        if (M.xf >= 1) drawSceneA(ctx, M.cA, S.t, live, true);
        else {
          bctx.setTransform(1, 0, 0, 1, 0, 0);
          bctx.clearRect(0, 0, V.cw, V.ch);
          drawSceneA(bctx, M.cA, S.t, live, true);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = M.xf;
          ctx.drawImage(bufA, 0, 0);
          ctx.globalAlpha = 1;
        }
      }
    }
    drawTextures(ctx, c);
    featherEdges(ctx);
    if (S.debug) drawDebug(ctx, c);
    ctx.restore();
  }

  // the viewer's position `secondsAgo` seconds ago
  function headAt(tq) {
    const h = S.history;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= tq) return h[i];
    return h[0] || S.head;
  }

  function updateViewer(dt) {
    const T = window.PerceptionHeadTracker?.state;
    const cam = !!(T && T.active && T.present);
    // when the camera briefly loses your face, hold where you were (instead of
    // snapping to the mouse), then drift gently back to centre
    if (cam) { S.lastCam = { x: T.x, y: T.y }; S.camLostAt = 0; }
    else if (T?.active && S.lastCam) {
      S.camLostAt = S.camLostAt || S.t;
      if (S.t - S.camLostAt > 2) { S.lastCam.x *= Math.exp(-dt * 0.4); S.lastCam.y *= Math.exp(-dt * 0.4); }
    }
    const src = cam ? T : (T?.active && S.lastCam ? S.lastCam : S.pointer);
    S.headSrc = cam ? 'camera' : (T?.active ? 'camera (face lost: holding)' : 'pointer');
    const k = 1 - Math.exp(-dt * (cam ? 3.5 : 2.2));
    const px = S.head.x, py = S.head.y;
    // follow, but never faster than a body moves: a speed limit stops jumps
    // (pointer leaving and re-entering the window, camera glitches)
    const maxStep = CFG.maxHeadSpeed * dt;
    S.head.x += clamp((src.x - S.head.x) * k, -maxStep, maxStep);
    S.head.y += clamp((src.y - S.head.y) * k, -maxStep, maxStep);
    const sp = Math.hypot(S.head.x - px, S.head.y - py) / Math.max(dt, 1e-3);
    // the viewer's own stillness, from the raw input (the smoothed view keeps
    // gliding for a moment after you stop)
    const rp = S.rawPrev || { x: src.x, y: src.y };
    const rsp = Math.hypot(src.x - rp.x, src.y - rp.y) / Math.max(dt, 1e-3);
    S.rawPrev = { x: src.x, y: src.y };
    S.rawSpeed = (S.rawSpeed || 0) + (rsp - (S.rawSpeed || 0)) * (1 - Math.exp(-dt * 6));
    S.headSpeed += (sp - S.headSpeed) * (1 - Math.exp(-dt * 4));
    S.stillFor = S.headSpeed < 0.05 ? S.stillFor + dt : 0;
    S.history.push({ t: S.t, x: S.head.x, y: S.head.y });
    while (S.history.length && S.history[0].t < S.t - 4) S.history.shift();
    return { cam, T };
  }

  /* The arc. One value, S.detach (0 = fully inside yourself, 1 = watching
   * yourself from far outside), carries the story; almost every effect reads it.
   *   arriving   the first ~20 s are faithful: the reflection is simply you
   *   noticing   detachment creeps up; lapses come more often and last longer,
   *              the eyes drift to look past you, depth thins, texture rises
   *   outside    watching yourself raises it further
   *   returning  you come back carrying some of it
   *   grounding  resting your attention on your own hands, still, brings you
   *              back: depth returns, the reflection syncs, its eyes meet yours */
  function updateArc(dt, M, c) {
    if (!S.begun) return;                     // the story starts when you choose to begin
    const A_ = CFG.arc, atA = M.distA < 0.03, atB = M.distB < 0.03;
    // grounding: attention on the hands (pointer resting over them, or with the
    // webcam, looking down) and holding still
    const T = window.PerceptionHeadTracker?.state;
    const camDown = !!(T && T.active && T.present && S.head.y > 0.45);
    const attending = atA && (S.overHands || camDown) && S.rawSpeed < 0.25;
    S.groundHold = attending ? S.groundHold + dt : 0;
    const gTarget = S.groundHold > A_.groundDelay ? 1 : 0;
    S.grounding += (gTarget - S.grounding) * (1 - Math.exp(-dt * (gTarget ? 0.8 : 2)));

    let d = 0;
    if (atB) d += A_.riseOutside;
    else if (atA && S.t - S.beginT > A_.faithful) d += A_.riseInside;
    else if (!atA && !atB) d += A_.riseOutside * 0.5;            // crossing
    d -= A_.groundRate * S.grounding;
    S.detach = clamp(S.detach + d * dt);
    S.residue *= Math.exp(-dt * A_.groundRate * 3 * S.grounding); // grounding also heals the leftover flatness
  }

  function updateSelf(dt, M) {
    const C = CFG.self, live = !S.reduced, D = S.detach;
    const atA = M.distA < 0.03, atB = M.distB < 0.03;

    // 3rdPOV: depth drains away the longer you watch; returns quickly when you leave
    if (atB) { S.visitedB = true; S.flat = Math.min(1, S.flat + dt / C.flattenTime); }
    else S.flat = Math.max(0, S.flat - dt / 2.5);

    // coming back: the reflection is late to arrive, and some depth stays lost
    if (S.visitedB && M.distA < 0.5) {      // back toward yourself, by either way
      S.cameBack = true; S.visitedB = false;
      S.residue = Math.min(0.6, S.residue + C.residuePerVisit);
      S.detach = clamp(S.detach + CFG.arc.onReturn);
    }
    if (S.cameBack && M.distA > 0.5) { S.cameBack = false; S.returnAt = -1; }
    if (S.cameBack && M.distA <= 0.001 && S.returnAt < 0) {
      S.returnAt = S.t;
      S.nextFreeze = Math.min(S.nextFreeze, S.t + rand([5, 9]));     // and it lapses again sooner
    }
    S.reflArrive = !S.cameBack ? 1 : (S.returnAt < 0 ? 0 : smooth(S.returnAt + 1.2, S.returnAt + 4, S.t));
    if (S.cameBack && S.reflArrive >= 1) { S.cameBack = false; S.returnAt = -1; }
    S.residue *= Math.exp(-dt * Math.LN2 / C.residueHalfLife);

    // lapses: the reflection stops following you for a moment, then catches up.
    // None while you're grounding; more often and longer the more detached you are.
    if (live && S.begun && atA && !S.freezeUntil && S.t > S.nextFreeze && S.headSpeed > 0.2 && S.reflArrive >= 1 && S.grounding < 0.3) {
      S.freezeUntil = S.t + lerp(C.freezeLength[0], C.freezeLength[1] + 1, D) * (0.85 + 0.3 * Math.random());
      S.hold = { x: S.self.x, y: S.self.y };
      S.detach = clamp(S.detach + CFG.arc.perLapse);
      if (!S.noticed) { S.noticed = true; S.noticedAt = S.t; }
    }
    if (S.freezeUntil && (S.t > S.freezeUntil || !atA || S.grounding > 0.6)) {
      S.freezeUntil = 0; S.hold = null; S.recover = 1;
      S.nextFreeze = S.t + lerp(C.freezeEvery[1], 12, D) * (0.7 + 0.6 * Math.random());
    }
    const lag = M.distA > 0.5 ? C.lagB : (C.lagA + 0.3 * S.residue + 0.35 * D) * (1 - 0.7 * S.grounding);
    const target = S.hold || headAt(S.t - lag);
    // low rate = more weight; grounding makes the reflection settle back onto you
    const rate = S.hold ? 0 : lerp(lerp(2.6, 0.9, S.recover), 5, S.grounding);
    S.recover = Math.max(0, S.recover - dt / 1.6);
    S.self.x += (target.x - S.self.x) * (1 - Math.exp(-dt * rate));
    S.self.y += (target.y - S.self.y) * (1 - Math.exp(-dt * rate));

    // the eyes keep watching you, a beat late, even when the body lapses; as
    // detachment grows they drift to look just past you, and meet you again
    // when you're grounded
    const gz = headAt(S.t - C.gazeLag), kg = 1 - Math.exp(-dt * 4);
    const past = D * (1 - S.grounding);
    S.gaze.x += (gz.x + past * 0.75 - S.gaze.x) * kg;
    S.gaze.y += (gz.y - past * 0.35 - S.gaze.y) * kg;

    // a hand adjusts itself, only while you're perfectly still, and only once
    // you've begun to come apart from yourself; never while you attend to them
    if (live && S.begun && atA && !S.twitch && S.stillFor > 3 && S.t > S.nextTwitch && D > 0.15 && S.grounding < 0.2) {
      S.twitch = { hand: Math.random() < 0.5 ? 0 : 1, start: S.t, sign: Math.random() < 0.5 ? -1 : 1 };
    }
    if (S.twitch && S.t - S.twitch.start > 3) { S.twitch = null; S.nextTwitch = S.t + lerp(C.twitchEvery[1], C.twitchEvery[0] * 0.6, D); }
  }

  function tick(now) {
    const dt = Math.min(0.05, S.last ? (now - S.last) / 1000 : 0.016);
    S.last = now;
    S.t += dt;
    S.fps += ((1 / Math.max(dt, 1e-3)) - S.fps) * 0.05;

    const { cam, T } = updateViewer(dt);
    const dur = S.reduced ? 1.6 : CFG.duration;

    // webcam distance (or the debug lean slider): a small lean in pushes the
    // camera into the scene; holding a bigger lean carries you on
    const simLean = S.debug && +dbgLean.value !== 0 ? +dbgLean.value : null;
    const leanSrc = cam && T.calibrated ? T.lean : simLean;
    if (leanSrc !== null) {
      const lv = Math.abs(leanSrc) < 0.04 ? 0 : leanSrc;      // deadband: ignore camera jitter
      S.lean += (lv - S.lean) * (1 - Math.exp(-dt * 2));
      const L = CFG.lean, cap = 1 / dur;
      if (S.lean > L.forward) { S.auto = false; S.uTarget += dt * Math.min(cap, (S.lean - L.forward) * L.gain); }
      else if (S.lean < L.back) { S.auto = false; S.uTarget -= dt * Math.min(cap, (L.back - S.lean) * L.gain); }
    } else S.lean += (0 - S.lean) * (1 - Math.exp(-dt * 3));
    const dollyT = S.reduced ? 0 : clamp(S.lean * CFG.lean.dolly, -0.03, CFG.lean.dollyMax);
    S.dolly += (dollyT - S.dolly) * (1 - Math.exp(-dt * 2));

    if (S.wheelBank) {                       // spend banked scroll at a capped rate
      const cap = CFG.maxScrub * dt / dur;
      const step = clamp(S.wheelBank, -cap, cap);
      S.uTarget += step; S.wheelBank -= step;
      if (Math.abs(S.wheelBank) < 1e-4) S.wheelBank = 0;
    }
    if (S.auto) {
      const dir = Math.sign(S.goal - S.uTarget);
      S.uTarget += dir * dt / dur;
      if ((dir > 0 && S.uTarget >= S.goal) || (dir < 0 && S.uTarget <= S.goal) || dir === 0) { S.uTarget = S.goal; S.auto = false; }
    }
    /* Progress is a cycle, two steps long:
     *   u 0 → 1   through your mirror and the archway, to behind yourself
     *   u 1 → 2   on into the far mirror, through your own figure, and out of
     *             your mirror again into your seat (u 2 is the same as u 0)
     * Going back retraces the way, but never behind the seat you last sat in. */
    const baseA = 2 * Math.floor((S.u + 1e-4) / 2);
    if (S.uTarget < baseA) { S.uTarget = baseA; S.wheelBank = Math.max(0, S.wheelBank || 0); if (S.goal < baseA) S.auto = false; }
    // the arch button appears once you've noticed the reflection isn't quite
    // you (or after a while regardless)
    const since = S.begun ? S.t - S.beginT : 0;
    S.open = TEST || S.noticed || (S.begun && since > CFG.arc.revealAfter) || (S.reduced && S.begun && since > 6) || S.u > 0.15;
    // (S.open only decides when the arch button appears; scrolling, clicking
    // the mirror, the keys and leaning always work)
    S.u += (S.uTarget - S.u) * (1 - Math.exp(-dt * (S.auto ? 30 : 5)));
    if (Math.abs(S.u - S.uTarget) < 1e-4) S.u = S.uTarget;
    if (S.u >= 4 && S.uTarget >= 4) { S.u -= 2; S.uTarget -= 2; S.goal -= 2; }   // keep the numbers small

    const M = where(S.u);
    let c;                                    // the 1stPOV → 3rdPOV camera (first half)
    // arriving: before you begin you're held a little too close to the mirror;
    // when you begin, the view settles back into your seat
    S.entry = S.begun ? Math.max(0, S.entry - dt / 3.5) : 1;
    if (M.seg === 0) {
      const cPath = camFromP(M.Pe) + (S.reduced ? 0 : 0.22 * smooth(0, 1, S.entry) * (1 - M.distA));
      // the dolly may only pull back a hair in 1stPOV (the art has no margin)
      c = S.reduced ? (M.Pe > 0.5 ? CFG.cEnd : 0) : cPath + (cPath > 1.4 ? Math.max(0, S.dolly) : S.dolly);
    } else {
      // second half: push into the far mirror, then come back out of your own
      const q = M.Pe;
      M.push = CFG.loop.pushMax * smooth(0, 0.4, q) + Math.max(0, S.dolly) * (1 - smooth(0, 0.15, q));
      M.cA = CFG.loop.aFrom * (1 - smooth(0.38, 1, q));
      if (M.cA < 1.4) M.cA += S.dolly;
      M.xf = smooth(0.37, 0.47, q);           // your mirror's glass taking over, once the far glass fills the view
      c = q < 0.47 ? CFG.cEnd : M.cA;
    }
    S.distA = M.distA; S.loopSeg = M.seg; S.loopQ = M.Pe;

    updateArc(dt, M, c);
    updateSelf(dt, M);
    syncVideos(now);
    frameNo++;                                // new screen refresh: video layers capture a fresh frame

    // the camera: your view + a slow idle drift. Eased down mid-crossing; in
    // 3rdPOV your movement goes to the figure instead, as the room goes flat.
    if (S.reduced) { S.pan.x = S.pan.y = 0; }
    else {
      let w;
      const handedOverB = 1 - (0.55 + 0.45 * S.flat);
      if (M.seg === 0) {
        const transit = 1 - 0.7 * smooth(1.0, 1.6, c) * (1 - smooth(2.3, 2.85, c));
        const handedOver = 1 - smooth(2.4, CFG.cEnd, c) * (0.55 + 0.45 * S.flat);
        w = transit * handedOver;
      } else {
        const q = M.Pe;
        w = lerp(handedOverB, 1, smooth(0.45, 1, q)) * (1 - 0.7 * smooth(0.15, 0.4, q) * (1 - smooth(0.6, 0.9, q)));
      }
      S.pan.x = S.head.x * w + 0.1 * Math.sin(S.t * 0.13) * (1 - S.flat);
      S.pan.y = S.head.y * w + 0.07 * Math.sin(S.t * 0.11 + 1) * (1 - S.flat);
    }

    requestAnimationFrame(tick);              // schedule first: an error below can't stop the piece
    try { render(M, c); } catch (err) { if (!S.renderErr) { S.renderErr = true; console.error('render error', err); } ctx.restore?.(); }
    updateUI(M, c);
  }

  // where u sits in the cycle: which half, how far along (eased), and how far
  // from the two rest views (0 = there)
  function where(u) {
    const w = ((u % 2) + 2) % 2, seg = w < 1 ? 0 : 1, Pe = easeInOut(w - seg);
    return { seg, Pe, distA: seg === 0 ? Pe : 1 - Pe, distB: seg === 0 ? 1 - Pe : Pe };
  }

  // ------------------------------------------------------------------ UI
  function updateUI(M, c) {
    const P = M.distA;
    const st = stateName(M, c);
    if (st !== S.state) {
      S.state = st;
      if (st === 'inhabit') statusEl.textContent = 'Seated at the table, facing your reflection.';
      if (st === 'observe') statusEl.textContent = 'Behind yourself now, looking at your own back.';
    }
    if (S.noticed && !S.saidNoticed) { S.saidNoticed = true; statusEl.textContent = 'Your reflection did not follow you.'; }
    if (S.grounding > 0.8 && !S.saidGround) { S.saidGround = true; statusEl.textContent = 'Attending to your hands, you settle back into yourself.'; }
    if (S.grounding < 0.2) S.saidGround = false;
    {
    }
    const behind = M.distB < 0.5;            // nearer the 3rdPOV view
    btn.classList.toggle('back', false);
    btn.classList.toggle('busy', S.auto);
    controls?.classList.toggle('pre', !S.begun);
    controls?.classList.toggle('idle', S.begun && S.t - S.lastActivity > 3.5);
    btn.classList.toggle('ready', S.ready && S.open && S.t > 2.2);
    const label = behind ? 'Go on, into the far mirror' : 'Step through the mirror';
    if (btn.getAttribute('aria-label') !== label) { btn.setAttribute('aria-label', label); btn.title = label; }
    if (S.debug && (S.t * 4 | 0) !== (S.dbgTick | 0)) {
      S.dbgTick = S.t * 4;
      const T = window.PerceptionHeadTracker?.state;
      dbgText.textContent =
        `state   ${st}\nP       ${P.toFixed(3)}   u ${S.u.toFixed(3)}\ncamera  c=${c.toFixed(3)}  pan ${S.pan.x.toFixed(2)},${S.pan.y.toFixed(2)}\n` +
        `input   ${S.headSrc}${T?.active ? `  lean ${S.lean.toFixed(2)}${T.calibrated ? '' : ' (calibrating)'}` : ''}\n` +
        `self    ${S.self.x.toFixed(2)},${S.self.y.toFixed(2)}  ${S.hold ? 'LAPSE' : 'following'}  next lapse ${Math.max(0, S.nextFreeze - S.t).toFixed(0)}s\n` +
        `hands   ${S.twitch ? 'adjusting' : 'still'}  next ${Math.max(0, S.nextTwitch - S.t).toFixed(0)}s (needs 3s stillness, now ${S.stillFor.toFixed(1)}s)\n` +
        `lean    ${S.lean.toFixed(2)}  dolly ${S.dolly.toFixed(2)}  gaze ${S.gaze.x.toFixed(2)},${S.gaze.y.toFixed(2)}\n` +
        `arc     detach ${S.detach.toFixed(2)}  grounding ${S.grounding.toFixed(2)}${S.overHands ? ' (over hands)' : ''}  open ${S.open}  noticed ${S.noticed}\n` +
        `depth   residue ${S.residue.toFixed(2)}   3rdPOV flat ${S.flat.toFixed(2)}   reflection arrive ${S.reflArrive.toFixed(2)}\n` +
        `video   ${Object.keys(VID).join(', ') || 'none'}\n` +
        `fps     ${S.fps.toFixed(0)}   reduced ${S.reduced}   duration ${CFG.duration}s\n` +
        `layers  (z: name)\n` + S.boxes.map(b => `  ${String(b.z).padStart(2)}: ${b.name}`).join('\n');
      if (document.activeElement !== dbgSlider) dbgSlider.value = ((S.u % 2) + 2) % 2;
    }
  }

  // forward always continues round the cycle; back stops at your seat
  const nextView = () => Math.floor(S.uTarget + 1e-3) + 1;
  const prevView = () => Math.max(2 * Math.floor((S.u + 1e-4) / 2), Math.ceil(S.uTarget - 1e-3) - 1);
  function go(goal) { S.goal = goal; S.auto = true; }
  btn.addEventListener('click', () => go(nextView()));

  // webcam (opt-in). Frames are analysed on this device and never sent anywhere.
  const camSupported = !!(navigator.mediaDevices?.getUserMedia && window.PerceptionHeadTracker);
  const setCamLabel = (label) => { if (camBtn) { camBtn.setAttribute('aria-label', label); camBtn.title = label; } };
  async function startCamera() {
    const HT = window.PerceptionHeadTracker;
    if (!camSupported || HT.state.active) return HT?.state.active;
    camBtn?.classList.add('pending');
    try {
      await HT.start();
      camBtn?.classList.add('on');
      setCamLabel('Stop using the camera');
      statusEl.textContent = 'Camera on. Move your head to look; lean in toward the mirror, lean back to return.';
      return true;
    } catch (err) {
      console.warn('head tracking unavailable:', HT.state.error || err);
      setCamLabel('Camera unavailable: ' + (HT.state.error || 'unknown error'));
      statusEl.textContent = 'The camera could not be used. ' + (HT.state.error || '');
      return false;
    } finally { camBtn?.classList.remove('pending'); }
  }
  function stopCamera() {
    window.PerceptionHeadTracker?.stop(); camBtn?.classList.remove('on');
    setCamLabel('Use your camera to look around (stays on this device)');
    statusEl.textContent = 'Camera off.';
  }
  if (camBtn) {
    if (!camSupported) camBtn.hidden = true;
    camBtn.addEventListener('click', () => (window.PerceptionHeadTracker?.state.active ? stopCamera() : startCamera()));
  }

  /* The opening: the title, a thin line while the artwork loads, then the
   * choice of how to begin (camera first; the mouse, or touch, as the quiet
   * alternative). The story's clock starts when you choose. In test mode
   * (?test or ?debug) it begins at once. */
  const coarse = matchMedia('(pointer: coarse)').matches;
  function setProgress(f) {
    const bar = opening?.querySelector('.progress');
    if (!bar) return;
    bar.querySelector('span').style.width = Math.round(f * 100) + '%';
    bar.setAttribute('aria-valuenow', Math.round(f * 100));
  }
  function begin() {
    if (S.begun) return;
    S.begun = true; S.beginT = S.t; S.lastActivity = S.t;
    S.nextFreeze = S.t + rand(CFG.self.firstFreeze);
    S.nextTwitch = S.t + rand(CFG.self.twitchEvery);
    opening?.classList.add('gone');
    setTimeout(() => { if (opening) opening.hidden = true; }, S.reduced ? 50 : 2300);
    canvas.focus?.();
    statusEl.textContent = 'Seated at the table, facing your reflection.';
  }
  function showChoices() {
    if (!opening) return begin();
    const box = opening.querySelector('.choices');
    const camB = box.querySelector('[data-choice="camera"]'), mouseB = box.querySelector('[data-choice="mouse"]');
    if (coarse) mouseB.textContent = camSupported ? 'Begin with touch' : 'Begin';
    if (coarse) box.querySelector('.note').textContent = camSupported
      ? 'Your camera image stays on this device. Move your head to look; lean in toward the mirror. With touch, drag to look and swipe up to go on.'
      : 'Drag to look; swipe up to go on.';
    if (!camSupported) { camB.hidden = true; mouseB.classList.add('primary'); if (!coarse) mouseB.textContent = 'Begin'; }
    box.hidden = false;
    requestAnimationFrame(() => { opening.classList.add('loaded'); (camSupported ? camB : mouseB).focus({ preventScroll: true }); });
    camB.addEventListener('click', async () => {
      camB.disabled = true;
      const ok = await startCamera();
      camB.disabled = false;
      if (ok) begin();
      else box.querySelector('.note').textContent = 'The camera couldn’t start (' + (window.PerceptionHeadTracker?.state.error || 'unavailable') + '). You can begin with the mouse instead.';
    });
    mouseB.addEventListener('click', begin);
  }

  // pointer: mouse moves the view a little; touch drags it; a vertical
  // swipe scrubs through the mirror; a click/tap on the mirror steps in
  const toArt = (e) => {
    const r = canvas.getBoundingClientRect(), sx = V.cw / r.width;
    return { x: ((e.clientX - r.left) * sx - V.bx) / V.K, y: ((e.clientY - r.top) * sx - V.by) / V.K };
  };
  const overMirror = (p) => {
    if ((S.distA ?? 0) > 0.02) return false;
    if (p.x < 385 || p.x > 1465 || p.y < 30 || p.y > 760) return false;
    const cx = 925, cy = 560, rr = 540;                       // arch top
    return p.y > cy || (p.x - cx) ** 2 + (p.y - cy) ** 2 < rr * rr;
  };
  const overHandsArt = (p) => p.y > 800 && ((p.x > 250 && p.x < 860) || (p.x > 1050 && p.x < 1630));
  const setPointerFrom = (e) => {
    S.overHands = overHandsArt(toArt(e));
    const r = canvas.getBoundingClientRect();
    S.pointer.x = clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
    S.pointer.y = clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
  };
  let drag = null;
  canvas.addEventListener('pointermove', (e) => {
    S.lastActivity = S.t;
    if (e.pointerType === 'mouse') {
      setPointerFrom(e);
      canvas.classList.toggle('over-mirror', overMirror(toArt(e)));
    }
    if (drag && drag.id === e.pointerId) {
      const dy = e.clientY - drag.y;
      if (e.pointerType !== 'mouse') setPointerFrom(e);
      if (Math.abs(e.clientY - drag.y0) > 12 || drag.scrubbing) {
        drag.scrubbing = true;
        S.auto = false;
        S.wheelBank = clamp((S.wheelBank || 0) - dy / (canvas.clientHeight * 1.4), -1, 1);
      }
      drag.y = e.clientY;
    }
  });
  canvas.addEventListener('pointerdown', (e) => {
    S.lastActivity = S.t;
    if (!S.begun) return;
    drag = { id: e.pointerId, y: e.clientY, y0: e.clientY, x0: e.clientX, t: performance.now(), scrubbing: false };
    canvas.setPointerCapture?.(e.pointerId);
  });
  const endDrag = (e) => {
    if (!drag || drag.id !== e.pointerId) return;
    const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
    if (!drag.scrubbing && moved < 10 && performance.now() - drag.t < 600 && overMirror(toArt(e))) go(nextView());
    if (drag.scrubbing) {                     // finish the gesture in the direction it was heading
      const nearest = Math.round(S.uTarget + (S.wheelBank || 0));       // settle on the nearest view
      S.wheelBank = 0; go(nearest);
    }
    if (e.pointerType !== 'mouse') { S.pointer.x = 0; S.pointer.y = 0; }
    drag = null;
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { S.pointer.x = 0; S.pointer.y = 0; S.overHands = false; } });

  window.addEventListener('wheel', (e) => {
    e.preventDefault();
    S.lastActivity = S.t;
    if (!S.begun) {
      // scrolling on the opening screen begins the piece (with the mouse)
      if (opening?.classList.contains('loaded')) begin(); else return;
    }
    const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    S.auto = false;
    // trackpads send bursts (and momentum after the fingers lift); bank the
    // scroll and let tick() spend it at a capped speed so it can't race.
    // About eight wheel notches carry you through the mirror.
    S.wheelBank = clamp((S.wheelBank || 0) + d * CFG.scrollStep, -1, 1);
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    S.lastActivity = S.t;
    if (!S.begun && e.key !== 'd' && e.key !== 'D') return;
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowUp' || e.key === 'PageDown') { go(nextView()); e.preventDefault(); }
    else if (e.key === 'ArrowDown' || e.key === 'PageUp' || e.key === 'Escape') { go(prevView()); e.preventDefault(); }
    else if (e.key === 'd' || e.key === 'D') setDebug(!S.debug);
  });

  // ------------------------------------------------------------------ debug
  const dbgText = document.createElement('div');
  const dbgSlider = Object.assign(document.createElement('input'), { type: 'range', min: 0, max: 1.999, step: 0.001, value: 0 });
  const dbgDur = Object.assign(document.createElement('input'), { type: 'number', min: 1, max: 60, step: 0.5, value: CFG.duration });
  dbgDur.style.width = '4em';
  const dbgLapse = Object.assign(document.createElement('button'), { type: 'button', textContent: 'lapse now' });
  const dbgTwitch = Object.assign(document.createElement('button'), { type: 'button', textContent: 'hand now' });
  const dbgLean = Object.assign(document.createElement('input'), { type: 'range', min: -0.2, max: 0.4, step: 0.01, value: 0 });
  {
    const l1 = document.createElement('label'); l1.append('scrub ', dbgSlider);
    const l2 = document.createElement('label'); l2.append('duration (s) ', dbgDur);
    const l3 = document.createElement('label'); l3.append(dbgLapse, ' ', dbgTwitch);
    const l4 = document.createElement('label'); l4.append('simulate lean ', dbgLean);
    dbgLean.addEventListener('dblclick', () => { dbgLean.value = 0; });
    dbgEl.append(dbgText, l1, l2, l3, l4);
    dbgSlider.addEventListener('input', () => { S.auto = false; S.wheelBank = 0; S.uTarget = S.u = +dbgSlider.value; });
    dbgDur.addEventListener('change', () => { CFG.duration = clamp(+dbgDur.value || 11, 1, 60); });
    dbgLapse.addEventListener('click', () => { S.nextFreeze = 0; S.headSpeed = Math.max(S.headSpeed, 0.3); });
    dbgTwitch.addEventListener('click', () => { S.twitch = { hand: Math.random() < 0.5 ? 0 : 1, start: S.t, sign: 1 }; });
  }
  function setDebug(on) { S.debug = on; dbgEl.hidden = !on; }
  setDebug(S.debug);

  const COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#f78c6b', '#c0f060', '#ff8fd0'];
  function drawDebug(g, c) {
    setBase(g);
    g.globalAlpha = 1;
    g.lineWidth = 1.5 / V.K;
    g.font = `${12 / V.K}px ui-monospace, Menlo, monospace`;
    for (const b of S.boxes) {
      g.strokeStyle = g.fillStyle = COLORS[b.z % COLORS.length];
      g.strokeRect(b.x, b.y, b.w, b.h);
      g.fillText(`${b.z} ${b.name}`, b.x + 4 / V.K, b.y + 14 / V.K);
    }
    if (c < 2.06 && !S.reduced) {
      const r = place(MM, CFG.focalA, CFG.mirrorD / (CFG.mirrorD - c), CFG.pan.wall);
      g.globalAlpha = 0.35;
      g.drawImage(IMG['scene-a/mirror-mask'], r.x, r.y, r.w, r.h);
      g.globalAlpha = 1;
    }
    const cross = (p, col) => {
      g.strokeStyle = col; g.beginPath();
      g.moveTo(p.x - 14, p.y); g.lineTo(p.x + 14, p.y); g.moveTo(p.x, p.y - 14); g.lineTo(p.x, p.y + 14); g.stroke();
    };
    cross(CFG.focalA, '#fff'); cross(CFG.arch.focal, '#ffd166'); cross(CFG.B.focal, '#4cc9f0');
    // viewer (white) vs self (red) as dots, top right
    const dot = (p, col) => { g.fillStyle = col; g.beginPath(); g.arc(1780 + p.x * 90, 120 + p.y * 90, 7, 0, 7); g.fill(); };
    g.strokeStyle = 'rgba(255,255,255,0.4)'; g.strokeRect(1690, 30, 180, 180);
    dot(S.head, '#fff'); dot(S.self, S.hold ? '#ff3b3b' : '#ff9a9a');
    g.strokeStyle = 'rgba(255,255,255,0.5)';
    g.setLineDash([8 / V.K, 6 / V.K]);
    g.strokeRect(0, 0, W, H);
    g.setLineDash([]);
  }

  // ------------------------------------------------------------------ boot
  if (S.debug || qs.has('inspect')) window.__perception = { S, CFG, withEyes, reflBuf, tick };   // inspection hook (?debug or ?inspect)
  new ResizeObserver(resize).observe(canvas);
  resize();
  loadImages(setProgress).then(() => {
    loadVideos();                          // after the stills, so they don't compete for bandwidth
    S.ready = true;
    requestAnimationFrame(tick);            // the scene shows, dimmed, behind the opening
    setTimeout(() => { camBtn?.classList.add('ready'); }, 2200);
    if (TEST || qs.has('notitle')) { if (opening) opening.hidden = true; begin(); }
    else showChoices();
    if (qs.has('p')) { S.u = S.uTarget = clamp(num(qs.get('p'), 0), 0, 1.999); }   // e.g. ?p=0.6 or ?p=1.5 to jump in (debug)
  }).catch((err) => {
    console.error(err);
    const msg = opening?.querySelector('.error');
    if (msg) { msg.hidden = false; msg.textContent = 'Some of the artwork didn’t load. Open the piece with “Open Perception.command” (see README).'; }
    opening?.querySelector('.progress')?.remove();
  });
})();
