# After Effects → website

Animate any layer in After Effects and the website plays your animation in that layer's place. Depth, parallax, the mirror mask and the head-tracking reactions all stay.

```
after-effects/
  build_perception_comps.jsx      builds everything in AE for you (step 1)
  renders/                        put your AE renders here (step 3)
  Convert renders for web.command double-click to convert them (step 4)
```

## Already done for you

`Perception.aep` (this folder) has all the comps plus three starter loops, made with `make_starter_animations.jsx` using only your painted layers. Each is one **Turbulent Displace** effect, set to loop seamlessly over 10 s:

- `scene-a__glass-clouds`: the fog on the mirror slowly breathes
- `scene-a__reflection` + `scene-a__reflection-glaze`: the reflection is very slightly unsteady, as if not quite solid. Both layers use identical settings so they stay registered, and the site keeps them frame-locked.

- `scene-a__hand-left` + `scene-a__hand-right`: **Puppet rigs.** The left hand has 12 pins, the right 11. Pins 1–7 on each hand are, in order: two wrist anchors, back of hand, index knuckle, thumb base, index fingertip, thumb tip. The rest are anchors along the bottom edge, keeping the wrist and sleeve on the frame edge. `animate_hand_pins.jsx` gives the fingertip pins a slow, looping ease: on the left, the index finger lifts off the thumb as if the grip were loosening; on the right, the ring of finger and thumb tightens, half a cycle later. Edit the numbers at the top of that script and run it again to change the motion. You can also select the Puppet effect and drag pins by hand; delete a pin's expression first (Option-click its stopwatch).

- `scene-b__figure`: **Puppet rig, the almost-turn.** 13 pins: 10 anchors (shoulders, collar, back, arm, legs, shoe) and 3 on the head (crown, left side, right side/ear). `animate_figure_head.jsx` finds the head pins by position and, in each 10 s loop, holds still for 3 s, slowly starts to turn the head toward its right as if sensing someone behind, holds, then settles back before the face is ever seen. Change `TURN` at the top of that script and run it again to make it stronger or fainter.

They're rendered, converted and switched on in the site. To change one, select its layer in the RENDER comp and press **E**. To remove one from the site, delete its line in `web/assets/videos.js`.

## 1. Build the comps (once)

In After Effects: **File → Scripts → Run Script File…** → choose `build_perception_comps.jsx`.

You'll get a **Perception** folder in the Project panel:

- **RENDER (animate + export these):** one comp per layer, e.g. `scene-a__reflection`, `scene-b__figure`, `scene-a__hand-left`. Each is cropped exactly to the box the website uses for that layer. **Animate inside these.**
- **PREVIEW:** `PREVIEW 1stPOV`, `PREVIEW archway`, `PREVIEW 3rdPOV`. These are the full 1920×1080 scenes assembled from the RENDER comps (mirror masked, clouds on Screen), so you can see your animation in context. Don't render these.

## 2. Animate

- Work inside a RENDER comp. The PSD still is already placed. The **Puppet Position Pin tool** works well on these painted layers. You can also add your own painted frames or layers.
- **Make it loop.** The site plays each video on repeat, so the last frame should flow into the first. Comps are 10 s at 30 fps; change the length if you like.
- **Stay inside the comp's edges.** Anything outside is cut off. If an animation needs more room (hair blowing past the edge, say), ask Claude to re-export that layer with padding.
- **Movement is added on top of the site's own.** The site still makes the reflection and 3rdPOV figure breathe and lean with the viewer, on top of your animation. If your animation already moves the whole body and the two fight, turn the site's own movement off for that layer in `web/assets/videos.js`: `'scene-b/figure': { puppet: false },`

## 3. Render

Select the RENDER comps you animated → **Composition → Add to Render Queue**. For each:

- **Output Module:** Format **QuickTime**, Video Codec **Apple ProRes 4444**, Channels **RGB + Alpha**, Color **Straight (Unmatted)**. The built-in **High Quality with Alpha** template also works. It writes *premultiplied* colour, which would darken soft brush edges, but the converter detects that and corrects it.
- **Output To:** the `after-effects/renders/` folder. **Keep the comp name as the file name** (e.g. `scene-a__reflection.mov`). That's how the converter knows which layer it is.

## 4. Convert for the web

Double-click **Convert renders for web.command**. (The first time, macOS may say it can't be opened: right-click it → **Open** → **Open**.)

For each render it makes a `.webm` (Chrome, Firefox, Edge) and a `.mov` (Safari), both transparent, in `web/assets/video/`. It also switches the layer on in `web/assets/videos.js`. Reload the site and the animation is live.

To go back to the still image, delete that layer's line from `videos.js`.

## Ideas that suit the piece

| Layer | Animation | Needs new art? |
|---|---|---|
| `scene-a__reflection` | a slow blink; the gaze drifting off and back | eyes on their own layer (open/closed) |
| `scene-a__reflection` | hair stirring, weight shifting | no |
| `scene-a__glass-clouds` | the fog on the glass slowly breathing | no |
| `scene-a__hand-left` / `hand-right` | fingers slowly flexing, one hand losing its grip | no, Puppet pins on the fingers |
| `scene-b__figure` | the head turning further, so a sliver of cheek shows | a painted cheek/profile edge for the right side of the head |
| `scene-b__mirror` | the face appearing in the far mirror, faintly | a painted face for that mirror |

**File size:** each looping layer is usually 0.1–3 MB. Animate the layers that matter and leave the rest as stills.
