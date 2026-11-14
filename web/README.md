# Before Language — 01: Perception (interactive)

Plain HTML, CSS and JavaScript. No frameworks, no build step, nothing to install.

```
web/
  index.html          the page
  styles.css          letterbox, the arch + eye buttons, debug panel
  js/main.js          the renderer: layers, camera, puppet motion, detachment, input
  js/headtrack.js     webcam head tracking (on-device, opt-in)
  assets/
    manifest.js       where each layer sits on the 1920×1080 canvas (generated)
    videos.js         which layers play After Effects animations (see ../after-effects/AE_GUIDE.md)
    video/…           those animations (created by the converter)
    scene-a/*.webp    1stPOV layers  (from PSD group "Scene 1")
    archway/*.webp    archway layers (from PSD group "Scene 2")
    scene-b/*.webp    3rdPOV layers  (from PSD group "Scene 3")
    png/…             full-size lossless PNG of every layer; drop straight into After Effects
    reference/        PSD composites used to check alignment
  tools/export_assets.py   one-off PSD → layers script (you don't need to run it)
```

## Running it

**Double-click `Open Perception.command`** (in the Perception folder). It starts a small local web server and opens the piece at <http://localhost:8417>. Keep its window open while viewing. The first time, macOS may say it can't be opened: right-click it → **Open** → **Open**.

Don't open `index.html` directly. Browsers block pixel reading and the webcam for pages opened from disk; the piece still runs that way but without eye tracking or head tracking.

Manual alternative, in Terminal:

```bash
cd ~/Downloads/Perception/web && python3 -m http.server 8417
```

Any static host also works, e.g. dragging the `web` folder onto Netlify Drop.

## Using it

The piece opens on a quiet threshold: the title over a dimmed glimpse of the scene, a thin line while the artwork loads, then **Begin with your camera** (recommended) or **Begin with the mouse** (**Begin with touch** on phones and tablets). The story's clock starts when you choose, and the view settles back from slightly too close into your seat. The buttons at the bottom appear once you've begun; they fade away while you're still and come back when you move, touch or press Tab.

**Framing:** on landscape screens the 16:9 picture fills the window, cropping at most ~6% a side rather than leaving dark bands; where bands remain, the picture's edge softens into them. Upright phones show the whole picture with a note that it's best seen turned sideways.

| With | To look around | To go through the mirror, and back |
|---|---|---|
| **Camera** | Move your head | Lean in toward the screen (a little lean pushes you closer; holding it carries you through); lean back to return |
| **Mouse / trackpad** | Move the pointer | **Scroll** forward to move into the next scenes, scroll back to return. The arch button, clicking the mirror, ↑ / ↓ and Esc also work |
| **Touch** | Drag | Swipe up / down |

Scrolling always moves you: about five wheel notches take you into the mirror, about ten through to behind yourself. Scrolling on the opening screen begins the piece. The arch button appears once the reflection has visibly slipped (or after 30 s). All movement is speed-limited, so trackpad momentum, the pointer leaving the window, or the camera losing your face can't make the view jump.

**Testing:** add `?test` to the address (e.g. `http://localhost:8417/?test`). The opening is skipped and the way through is open from the start, so click or scroll straight in. `?debug` does the same and also shows the debug panel.

The webcam is opt-in and the video is analysed on the computer itself; no image is sent or stored. The face model loads from the internet the first time (cdn.jsdelivr.net and storage.googleapis.com), so head tracking needs a connection. Camera access works on `localhost` and on any `https://` site.

## The story: inside, outside, and back

The piece asks one question: what changes when you stop experiencing yourself from inside and start watching yourself from outside, the way depersonalization feels. The interaction is built to carry that question rather than decorate it. One value, **detachment**, runs through everything (0 = fully inside yourself, 1 = watching from far outside), and almost every effect reads from it.

1. **Arriving.** A quiet title, then you're seated at the table. For the first ~20 seconds the reflection is simply you: it follows faithfully, a fraction late like any body. This establishes trust.
2. **Noticing.** Detachment creeps up the longer you stay. The reflection begins to lapse: while you move it stops following for a moment, then slowly catches up. Lapses come more often and last longer as detachment grows. Its eyes stop meeting yours and drift to look just past you. Depth thins, and the canvas texture rises over everything, as if the world were turning back into paint. When you're perfectly still, a hand sometimes adjusts itself.
3. **The threshold.** You can scroll, lean or click your way through the mirror at any time. The arch button, the quiet invitation to go on, only appears once you've seen the reflection fail to follow you (or after 30 seconds).
4. **Outside.** Through the glass and the archway, you're behind yourself. Your movement no longer moves the view; it moves the figure, half a second late. The longer you watch, the flatter the room becomes, until it's one painted surface and only the figure responds. Now and then the figure almost turns around. Detachment keeps rising.
5. **Returning.** You come back carrying some of it. The glass is empty at first; the reflection arrives a few seconds late, depth is flatter, and lapses return sooner.
6. **Grounding.** Rest your attention on your own hands (the pointer resting on them, or looking down with the webcam) and hold still. After a moment detachment eases: the texture clears, depth returns, lapses stop, the reflection settles back onto your movement, and its eyes meet yours again. Attending to your own body is the way back in, which is also a real grounding technique for depersonalization.

7. **The loop.** From behind yourself, keep going forward: the camera pushes toward the far mirror, your own figure dissolves as you pass through it, its glass becomes your mirror's glass, and you come back out into your seat. Inside → outside → inside, endlessly. Going back retraces the way, but never behind the seat you last sat in.

Each crossing leaves you a little further out, and grounding is always available.

**Tuning:** `CFG.arc` (how fast detachment builds and heals, when the threshold opens), `CFG.self` (lag, lapses, lean, head, eyes), `CFG.texture` (how strong the canvas texture gets), all at the top of `js/main.js`. In `?debug` the panel shows detachment, grounding and whether you're over the hands; **lapse now** / **hand now** buttons and the **simulate lean** slider help testing. The white and red dots (top right) are you and your reflection's response.

**The eyes:** each iris and pupil was cut from your painting into its own small sprite, and the space behind it filled with eye-white continued from the visible whites (`tools/cut_eyes.py` → `assets/eyes/`). The site draws the face without irises, then each iris clipped to the eye opening, which sits just inside the lids, shifted toward you. So the lids and lashes stay put while the eye moves. At rest it matches the painting almost exactly. (The reflection uses the still painting now, not the AE wobble loop, so the cut-out lines up.)

**Canvas textures** (`assets/texture/`, listed in `assets/textures.js`): three layers at once: **weave** (canvas, linen, jute) in soft-light, **paper** (paper, watercolour paper) in overlay, and **paint** (brushstrokes, oil, gesso, grunge) in soft-light. Each cycles through its own pool on its own rhythm, dissolving between textures and drifting its own way, so the combination keeps changing. Overall strength is 10% when you're present, up to 50% when detached, and stronger mid-crossing. `?notexture` turns them off.

To add textures: put photos in a folder, named `weave-…`, `paper-…` or `paint-…`, and run `python3 web/tools/prepare_textures.py <folder> web/assets`, or ask Claude to. Each becomes a neutral-grey, seamless, colour-free tile, so it adds surface but never tints the art.

## How it works

- **Scene A (1stPOV):** wall → masked mirror interior → frame → table → hands, each its own plane. The mirror interior (glass, reflection, haze, Screen-blended clouds, scratches) is composed off-screen and clipped to the mirror opening, so the reflection can move inside the glass without ever leaving the frame. The table is drawn as thin strips at different depths, like a real receding surface. Its far edge stays on the mirror plane, so the mirror never lifts off the table.
- **Camera:** one number, `c`, is the distance walked forward. Every plane scales by ordinary perspective for its depth, so near things rush past and far things grow slowly. Both end points reproduce your PSD compositions exactly. The only difference is a 4% zoom (2% per side) that leaves room for parallax, because the art has no painted margin.
- **Crossing:** the mirror opening fills the frame → the reflection dissolves (the thinner glass where it sat stays as a faint after-image) → the glass mists away to reveal the archway, with the 3rdPOV room beyond its doorway → the camera passes through the arch → the rear view settles.
- **Puppet motion:** layers bend in thin slices around a pivot. The reflection breathes from below the table line. Each hand rocks slightly from its wrist, on its own rhythm. In 3rdPOV the figure breathes and leans from the seat while the chair stays still. The mirror clouds drift very slowly. All of it is a pixel or two; edit the amplitudes in `main.js` (`breath`, `sway`, `0.0055` for hand angle).
- **Tuning:** everything adjustable is in `CFG` and `PATH` at the top of `js/main.js`.

## After Effects animations

See [`../after-effects/AE_GUIDE.md`](../after-effects/AE_GUIDE.md). In short: run the AE script, animate, render to `after-effects/renders/`, then double-click **Convert renders for web.command**.

## Updating the art

Edit `Perception.psd` and keep the three groups and layer order as they are. Then either ask Claude to re-run the export, or export each layer from Photoshop as a PNG with transparency at full 1920×1080 canvas size. Use the file names in `assets/png/…` and convert them to WebP, or point `manifest.js` at the PNGs.

## Art that would improve it (optional)

1. **Edge bleed:** extend the wall (Scene 1 Layer 36), the archway wall (Scene 2 Layer 64) and the room (Scene 3 Layer 51) by about 120px on every side, keeping the 1920×1080 area unchanged. That removes the 4% zoom and allows stronger parallax.
2. **Separate head layer** for the 3rdPOV figure (hair + head apart from the body). That would allow a slight head tilt in the "recognition" moment.
3. **Even glass base** (Scene 1 Layer 30 without the thinner patch behind the character), if you'd rather the reflection vanish completely instead of leaving a faint after-image.

On a portrait phone the piece letterboxes to keep your full 16:9 composition. A vertical crop would need art decisions from you.
