/* Webcam head tracking for Perception.
 *
 * Uses Google's MediaPipe Face Landmarker, running entirely in the browser:
 * camera frames never leave the device. Only three numbers come out:
 *
 *   x, y   head position, -1..1, mirrored so moving right reads as right
 *   lean   how much closer (+) or further (-) than when tracking started
 *
 * Usage: PerceptionHeadTracker.start().then(...); read PerceptionHeadTracker.state
 */
(() => {
  'use strict';

  const VERSION = '0.10.14';
  const CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}`;
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

  const state = { active: false, present: false, x: 0, y: 0, lean: 0, error: null, calibrated: false };
  let video = null, landmarker = null, stream = null, raf = 0, lastVideoTime = -1;
  let base = null, baseSamples = [], lostSince = 0;

  async function start() {
    if (state.active) return state;
    state.error = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser has no camera access.');
      const vision = await import(`${CDN}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
      });
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false,
      });
      video = Object.assign(document.createElement('video'), { playsInline: true, muted: true, autoplay: true });
      video.srcObject = stream;
      await video.play();
      state.active = true;
      base = null; baseSamples = []; state.calibrated = false;
      loop();
    } catch (err) {
      stop();
      state.error = err?.name === 'NotAllowedError' ? 'Camera permission was declined.' : (err?.message || String(err));
      throw err;
    }
    return state;
  }

  function stop() {
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach(t => t.stop());
    stream = null; video = null;
    landmarker?.close?.(); landmarker = null;
    Object.assign(state, { active: false, present: false, x: 0, y: 0, lean: 0 });
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!video || !landmarker || video.readyState < 2 || video.currentTime === lastVideoTime) return;
    lastVideoTime = video.currentTime;
    const res = landmarker.detectForVideo(video, performance.now());
    const lm = res?.faceLandmarks?.[0];
    if (!lm) {
      if (state.present) lostSince = performance.now();
      state.present = false;
      // after a few seconds away, recalibrate "normal distance" on return
      if (performance.now() - lostSince > 3000) { base = null; baseSamples = []; state.calibrated = false; }
      return;
    }
    state.present = true;
    const L = lm[33], R = lm[263], nose = lm[1];            // outer eye corners, nose tip
    const eyeDist = Math.hypot(R.x - L.x, R.y - L.y);
    const cx = (L.x + R.x + nose.x) / 3, cy = (L.y + R.y + nose.y) / 3;
    // mirrored, and scaled so a comfortable head move covers most of -1..1
    state.x = Math.max(-1, Math.min(1, -(cx - 0.5) * 3.2));
    state.y = Math.max(-1, Math.min(1, (cy - 0.45) * 3.6));
    if (!base) {
      baseSamples.push(eyeDist);
      if (baseSamples.length >= 45) {                       // ~1.5 s of frames
        const s = baseSamples.slice().sort((a, b) => a - b);
        base = s[s.length >> 1];
        state.calibrated = true;
      }
      state.lean = 0;
    } else {
      state.lean = eyeDist / base - 1;
    }
  }

  window.PerceptionHeadTracker = { start, stop, state };
})();
